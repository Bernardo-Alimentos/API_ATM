/*
================================================================================
ARQUIVO: /services/automationService.js
INSTRUÇÕES: O coração da automação, com os loops e a lógica de negócio.
================================================================================
*/
const empresaModel = require('../models/empresaModel');
const averbacaoLogModel = require('../models/averbacaoLogModel');
const erpService = require('./erpService');
const atmService = require('./atmService'); // Importa o novo serviço da AT&M

const automationService = {
    async processarNotasPendentes() {
        console.log(`\n[${new Date().toLocaleString('pt-BR')}] --- INICIANDO PROCESSAMENTO DE REGRAS E AVERBAÇÃO ---`);
        const notasParaProcessar = await averbacaoLogModel.findPending();

        if (notasParaProcessar.length > 0) {
            console.log(`   Encontradas ${notasParaProcessar.length} notas para aplicar regras de negócio e tentar averbação.`);
        } else {
            console.log(`   Nenhuma nota pendente de processamento encontrada.`);
        }

        for (const nota of notasParaProcessar) {
            const representantesIgnorarConfig = (nota.representantes_ignorar || '').split(',').map(s => s.trim()).filter(Boolean);
            const repString = String(nota.representante);
            const tipoNotaString = String(nota.tipo_nota);

            let deveIgnorar = false;

            // 1. Regra base: Ignorar se o representante estiver na lista de ignorados da empresa
            if (representantesIgnorarConfig.includes(repString)) {
                deveIgnorar = true;

                // 2. Exceção à regra base: Se houver uma exceção configurada e ela corresponder
                // Verifica se o representante da nota é o representante de exceção E o tipo de nota da nota é o tipo de nota de exceção
                if (repString === String(nota.excecao_representante) && tipoNotaString === String(nota.excecao_tipo_nota)) {
                    deveIgnorar = false; // A exceção se aplica, então NÃO deve ignorar esta nota
                    console.log(`   -> Nota ${nota.numero_nota} (Rep: ${repString}, Tipo: ${tipoNotaString}) NÃO IGNORADA devido à regra de exceção da empresa ${nota.nome_empresa}.`);
                }
            }

            // 3. Regra específica para a Empresa com ID 3: Ignorar representantes 97 e 99 SEMPRE.
            // Esta regra tem prioridade e sobrescreve qualquer exceção anterior para a Empresa 3.
            if (nota.id_empresa === 3 && (repString === '97' || repString === '99')) {
                deveIgnorar = true;
                console.log(`   -> Nota ${nota.numero_nota} (Rep: ${repString}) IGNORADA pela regra específica da Empresa 3.`);
            }


            if (deveIgnorar) {
                console.log(`   -> Nota ${nota.numero_nota} (Rep: ${repString}, Tipo: ${tipoNotaString}) IGNORADA por regra de negócio.`);
                await averbacaoLogModel.updateStatus(nota.id, 'IGNORADA_REGRA', `Nota ignorada por regra: Representante ${repString} ou regra específica da empresa.`);
            } else {
                console.log(`   -> Nota ${nota.numero_nota} (Rep: ${repString}, Tipo: ${tipoNotaString}) APROVADA no filtro. Pronta para averbação.`);
                // Atualiza o status para indicar que está aguardando o envio para AT&M
                await averbacaoLogModel.updateStatus(nota.id, 'AGUARDANDO_ENVIO_ATM', 'Aprovada no filtro de regras, iniciando averbação.');

                // LÓGICA PARA PEGAR O XML E ENVIAR PARA AT&M
                try {
                    // 1. Obter o XML da nota do ERP
                    // data_emissao do DB pode ser um objeto Date ou string. Formatamos para YYYY-MM-DD.
                    const dataEmissaoFormatada = new Date(nota.data_emissao).toISOString().slice(0, 10);
                    
                    console.log(`     -> Buscando XML da nota ${nota.numero_nota} (Empresa: ${nota.nome_empresa}) no ERP para data ${dataEmissaoFormatada}...`);
                    // erpService.fetchNotaXML precisa do nome da empresa, data e número da nota
                    const nfeXml = await erpService.fetchNotaXML(nota.nome_empresa, dataEmissaoFormatada, nota.numero_nota);

                    if (!nfeXml) {
                        console.warn(`     -> XML não encontrado no ERP para a nota ${nota.numero_nota}.`);
                        await averbacaoLogModel.updateStatus(nota.id, 'ERRO_AVERBACAO', 'XML da nota não encontrado no ERP.');
                        continue; // Pula para a próxima nota
                    }
                    console.log(`     -> XML da nota ${nota.numero_nota} obtido com sucesso.`);

                    // 2. Enviar o XML para a AT&M
                    let averbacaoResult;
                    try {
                        averbacaoResult = await atmService.averbarNFe(nfeXml);
                    } catch (atmError) {
                        // Se o erro for de Token expirado (código 915 da AT&M), tenta reautenticar e re-enviar UMA VEZ
                        if (atmError.message.includes('Token expirado') || (atmError.response && atmError.response.data && atmError.response.data.Codigo === '915')) {
                            console.log('     -> AT&M Token expirado. Tentando reautenticar e re-enviar a nota...');
                            try {
                                await atmService.authenticate(); // Força nova autenticação
                                averbacaoResult = await atmService.averbarNFe(nfeXml); // Tenta enviar novamente
                            } catch (retryError) {
                                console.error('     -> Falha na reautenticação ou re-envio:', retryError.message);
                                throw retryError; // Lança o erro se a tentativa de reenvio falhar
                            }
                        } else {
                            throw atmError; // Re-lança outros tipos de erros da AT&M
                        }
                    }
                    
                    // 3. Atualizar o status da averbação no log
                    if (averbacaoResult.success) {
                        const protocolo = averbacaoResult.data.Averbado?.Protocolo || 'N/A';
                        const numAverbacao = averbacaoResult.data.Averbado?.DadosSeguro?.[0]?.NumeroAverbacao || 'N/A';
                        console.log(`     -> Nota ${nota.numero_nota} AVERBADA com sucesso. Protocolo: ${protocolo}`);
                        await averbacaoLogModel.updateStatus(nota.id, 'AVERBADA', `Averbada. Protocolo AT&M: ${protocolo}. Nº Averb: ${numAverbacao}`);
                    } else {
                        // Se a AT&M retornou um erro de negócio (ex: documento já cadastrado)
                        console.error(`     -> Erro de averbação da AT&M para nota ${nota.numero_nota}: ${averbacaoResult.message}`);
                        await averbacaoLogModel.updateStatus(nota.id, 'ERRO_AVERBACAO', `Erro AT&M: ${averbacaoResult.message}`);
                    }

                } catch (error) {
                    console.error(`     -> ERRO NO PROCESSO DE AVERBAÇÃO para nota ${nota.numero_nota}:`, error.message);
                    await averbacaoLogModel.updateStatus(nota.id, 'ERRO_AVERBACAO', `Erro no processo de averbação: ${error.message}`);
                }
            }
        }
        console.log(`--- FIM DO PROCESSAMENTO DE REGRAS E AVERBAÇÃO ---`);
    },

    async checarNotasParaTodasEmpresas() {
        console.log(`\n[${new Date().toLocaleString('pt-BR')}] --- INICIANDO CICLO DE VERIFICAÇÃO NO ERP ---`);
        try {
            const empresas = await empresaModel.findAllActive();
            console.log(`Encontradas ${empresas.length} empresas ativas para verificação.`);

            for (const empresa of empresas) {
                try {
                    // Define a data de busca. Para produção, usaria a data atual.
                    // const hoje = new Date().toISOString().slice(0, 10);
                    const dataDeBusca = '2025-05-15'; // Mantendo a data de teste por enquanto

                    // CORREÇÃO: Ignorar notas canceladas deve ser tratado aqui, se a API do ERP permitir filtrar.
                    // Se a API do ERP não filtrar, a lógica de "ignorar notas canceladas" precisaria ser implementada
                    // após o fetchNotas, antes de criar o log.
                    const notasDoErp = await erpService.fetchNotas(empresa, dataDeBusca);
                    let novasNotasIntegradas = 0;

                    for (const nota of notasDoErp) {
                        // Assumindo que 'situacao=2' já filtra notas não canceladas no erpService.fetchNotas
                        // Se não, você precisaria adicionar uma verificação aqui:
                        // if (nota.situacao === 'CANCELADA') { continue; }

                        const jaExiste = await averbacaoLogModel.findExisting(String(nota.codNumNota), empresa.id);
                        if (!jaExiste) {
                            await averbacaoLogModel.create({
                                id_empresa: empresa.id,
                                numero_nota: nota.codNumNota,
                                representante: nota.codRepresentante,
                                tipo_nota: nota.codTipoDeNota,
                                data_emissao: nota.dataEmissao
                            });
                            novasNotasIntegradas++;
                        }
                    }
                    console.log(`   RESUMO para ${empresa.nome_empresa}: ${notasDoErp.length} notas encontradas no ERP. ${novasNotasIntegradas} novas notas integradas ao log.`);
                } catch (error) {
                    console.error(`   ERRO ao consultar API do ERP para a empresa ${empresa.nome_empresa}:`, error.message);
                }
            }
        } catch (error) {
            console.error("ERRO GERAL no ciclo de verificação do ERP:", error.message);
        } finally {
            console.log(`--- CICLO DE VERIFICAÇÃO NO ERP FINALIZADO ---`);
            // Após verificar e integrar novas notas, processa as pendentes
            await this.processarNotasPendentes(); 
        }
    },

    start() {
        console.log(`\nAutomação configurada para rodar a cada 10 minutos.`);
        // Roda uma vez ao iniciar o servidor
        this.checarNotasParaTodasEmpresas(); 
        const DEZ_MINUTOS = 10 * 60 * 1000;
        // Configura o loop para rodar a cada 10 minutos
        setInterval(() => this.checarNotasParaTodasEmpresas(), DEZ_MINUTOS);
    }
};

module.exports = automationService;
