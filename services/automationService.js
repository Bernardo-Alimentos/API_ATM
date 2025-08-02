/*
================================================================================
ARQUIVO: /services/automationService.js
INSTRUÇÕES: O coração da automação, com os loops e a lógica de negócio.
================================================================================
*/
const empresaModel = require('../models/empresaModel');
const averbacaoLogModel = require('../models/averbacaoLogModel');
const erpService = require('./erpService');
const atmService = require('./atmService');
const notificationService = require('./notificationService');

const automationService = {
    /**
     * Processa notas pendentes de averbação, aplicando regras de negócio e tentando o envio para a AT&M.
     * @param {Array<number>} [noteIdsToProcess] - Opcional. Um array de IDs de notas para processar.
     * Se não for fornecido, processa todas as notas com status 'PENDENTE_PROCESSAMENTO'.
     * @returns {object} Um resumo do processamento contendo notas averbadas, com erro e ignoradas.
     */
    async processarNotasPendentes(noteIdsToProcess = null) {
        console.log(`\n[${new Date().toLocaleString('pt-BR')}] --- INICIANDO PROCESSAMENTO DE REGRAS E AVERBAÇÃO ---`);
        let notasParaProcessar = [];

        // Variáveis para o resumo do processamento
        let totalNotasConsideradas = 0;
        let notasAverbadas = [];
        let notasComErro = [];
        let notasIgnoradas = [];

        try {
            if (noteIdsToProcess && noteIdsToProcess.length > 0) {
                console.log(`   Processando notas selecionadas manualmente: IDs [${noteIdsToProcess.join(', ')}]`);
                notasParaProcessar = await averbacaoLogModel.findByIdsAndProcessableStatus(noteIdsToProcess);
            } else {
                console.log(`   Buscando todas as notas pendentes de processamento.`);
                notasParaProcessar = await averbacaoLogModel.findPending();
            }

            totalNotasConsideradas = notasParaProcessar.length;

            if (totalNotasConsideradas === 0) {
                console.log(`   Nenhuma nota pendente de processamento encontrada para os critérios atuais.`);
                // Retorna um resumo vazio, o e-mail será condicionalmente enviado pelo chamador.
                return { totalNotasConsideradas, notasAverbadas, notasComErro, notasIgnoradas };
            }

            for (const nota of notasParaProcessar) {
                console.log(`\n   -> Processando nota ${nota.numero_nota} (ID: ${nota.id}, Status Atual: ${nota.status})...`);
                console.log('   [DEBUG] Objeto nota antes de chamar erpService.fetchNotaXML:', {
                    id: nota.id,
                    numero_nota: nota.numero_nota,
                    id_empresa: nota.id_empresa,
                    nome_empresa: nota.nome_empresa,
                    empresa_id_erp: nota.empresa_id_erp,
                    representante: nota.representante,
                    tipo_nota: nota.tipo_nota,
                    status: nota.status
                });

                const representantesIgnorarConfig = (nota.representantes_ignorar || '').split(',').map(s => s.trim()).filter(Boolean);
                const repString = String(nota.representante);
                const tipoNotaString = String(nota.tipo_nota);

                let deveIgnorar = false;
                let motivoIgnorar = '';

                // 1. Regra base: Ignorar se o representante estiver na lista de ignorados da empresa
                if (representantesIgnorarConfig.includes(repString)) {
                    deveIgnorar = true;
                    motivoIgnorar = `Representante ${repString} na lista de ignorados.`;

                    // 2. Exceção à regra base: Se houver uma exceção configurada e ela corresponder
                    if (repString === String(nota.excecao_representante) && tipoNotaString === String(nota.excecao_tipo_nota)) {
                        deveIgnorar = false;
                        motivoIgnorar = `Exceção para Representante ${repString} e Tipo Nota ${tipoNotaString} aplicada.`;
                        console.log(`     -> Nota ${nota.numero_nota} (Rep: ${repString}, Tipo: ${tipoNotaString}) NÃO IGNORADA devido à regra de exceção da empresa ${nota.nome_empresa}.`);
                    }
                }

                // 3. Regra específica para a Empresa com ID 3: Ignorar representantes 97 e 99 SEMPRE.
                if (nota.id_empresa === 3 && (repString === '97' || repString === '99')) {
                    deveIgnorar = true;
                    motivoIgnorar = `Regra específica da Empresa 3: Representante ${repString} deve ser ignorado.`;
                    console.log(`     -> Nota ${nota.numero_nota} (Rep: ${repString}) IGNORADA pela regra específica da Empresa 3.`);
                }

                // 4. Nova regra: Ignorar notas com mais de 15 dias de emissão
                const dataEmissao = new Date(nota.data_emissao);
                const quinzeDiasAtras = new Date();
                quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15);

                if (dataEmissao < quinzeDiasAtras) {
                    deveIgnorar = true;
                    motivoIgnorar = `Nota com mais de 15 dias de emissão (Data Emissão: ${dataEmissao.toLocaleDateString('pt-BR')}).`;
                    console.log(`     -> Nota ${nota.numero_nota} IGNORADA: ${motivoIgnorar}`);
                }


                if (deveIgnorar) {
                    console.log(`   -> Nota ${nota.numero_nota} (Rep: ${repString}, Tipo: ${tipoNotaString}) IGNORADA por regra de negócio. Motivo: ${motivoIgnorar}`);
                    await averbacaoLogModel.updateStatus(nota.id, 'IGNORADA_REGRA', `Ignorada: ${motivoIgnorar}`);
                    notasIgnoradas.push({ numero_nota: nota.numero_nota, motivo: motivoIgnorar });
                } else {
                    console.log(`   -> Nota ${nota.numero_nota} (Rep: ${repString}, Tipo: ${tipoNotaString}) APROVADA no filtro. Pronta para averbação.`);
                    await averbacaoLogModel.updateStatus(nota.id, 'AGUARDANDO_ENVIO_ATM', 'Aprovada no filtro de regras, iniciando averbação.');

                    try {
                        const dataEmissaoFormatada = new Date(nota.data_emissao).toISOString().slice(0, 10);

                        console.log(`     -> Buscando XML da nota ${nota.numero_nota} (Empresa: ${nota.nome_empresa}) no ERP para data ${dataEmissaoFormatada}...`);
                        const nfeXml = await erpService.fetchNotaXML(nota.empresa_id_erp, nota.nome_empresa, dataEmissaoFormatada, nota.numero_nota);

                        if (!nfeXml) {
                            console.warn(`     -> XML não encontrado no ERP para a nota ${nota.numero_nota}.`);
                            await averbacaoLogModel.updateStatus(nota.id, 'ERRO_AVERBACAO', 'XML da nota não encontrado no ERP.');
                            notasComErro.push({ numero_nota: nota.numero_nota, motivo: 'XML não encontrado no ERP.' });
                            continue;
                        }
                        console.log(`     -> XML da nota ${nota.numero_nota} obtido com sucesso.`);

                        let averbacaoResult;
                        try {
                            averbacaoResult = await atmService.averbarNFe(nfeXml);
                        } catch (atmError) {
                            if (atmError.message.includes('Token expirado') || (atmError.response && atmError.response.data && atmError.response.data.Codigo === '915')) {
                                console.log('    AT&M Token expirado. Tentando reautenticar e re-enviar a nota...');
                                try {
                                    await atmService.authenticate();
                                    averbacaoResult = await atmService.averbarNFe(nfeXml);
                                } catch (retryError) {
                                    const msg = `Falha na reautenticação ou re-envio: ${retryError.message}`;
                                    console.error(`     -> ${msg}`);
                                    await averbacaoLogModel.updateStatus(nota.id, 'ERRO_AVERBACAO', msg);
                                    notasComErro.push({ numero_nota: nota.numero_nota, motivo: msg });
                                    continue;
                                }
                            } else {
                                throw atmError; // Lança o erro para ser capturado abaixo e adicionado a notasComErro
                            }
                        }

                        if (averbacaoResult.success) {
                            const protocolo = averbacaoResult.data.Averbado?.Protocolo || 'N/A';
                            const numAverbacao = averbacaoResult.data.Averbado?.DadosSeguro?.[0]?.NumeroAverbacao || 'N/A';
                            const msgSucesso = `Averbada. Protocolo AT&M: ${protocolo}. Nº Averb: ${numAverbacao}`;
                            console.log(`     -> Nota ${nota.numero_nota} AVERBADA com sucesso. Protocolo: ${protocolo}`);
                            await averbacaoLogModel.updateStatus(nota.id, 'AVERBADA', msgSucesso);
                            notasAverbadas.push({ numero_nota: nota.numero_nota, protocolo: protocolo });
                        } else {
                            const atmErrorMessage = averbacaoResult.message || (averbacaoResult.data?.Erros?.Erro?.[0]?.Descricao) || 'Detalhes no log.';
                            console.error(`     -> Erro de averbação da AT&M para nota ${nota.numero_nota}: ${atmErrorMessage}`);
                            await averbacaoLogModel.updateStatus(nota.id, 'ERRO_AVERBACAO', `Erro AT&M: ${atmErrorMessage}`);
                            notasComErro.push({ numero_nota: nota.numero_nota, motivo: atmErrorMessage });
                        }

                    } catch (error) {
                        // Este catch pega erros do ERP (XML não encontrado) ou erros genéricos da AT&M
                        console.error(`     -> ERRO NO PROCESSO DE AVERBAÇÃO para nota ${nota.numero_nota}:`, error.message);
                        await averbacaoLogModel.updateStatus(nota.id, 'ERRO_AVERBACAO', `Erro no processo de averbação: ${error.message}`);
                        notasComErro.push({ numero_nota: nota.numero_nota, motivo: error.message });
                    }
                }
            }
        } catch (generalError) {
            console.error(`ERRO GERAL no processamento de notas pendentes:`, generalError.message);
            notasComErro.push({ numero_nota: 'N/A (Erro Geral)', motivo: `Erro geral no processamento: ${generalError.message}` });
        } finally {
            console.log(`--- FIM DO PROCESSAMENTO DE REGRAS E AVERBAÇÃO ---`);
            // O e-mail de resumo será enviado pelo chamador (checarNotasParaTodasEmpresas)
            // se houver erros.
        }
        return { totalNotasConsideradas, notasAverbadas, notasComErro, notasIgnoradas };
    },

    async checarNotasParaTodasEmpresas() {
        console.log(`\n[${new Date().toLocaleString('pt-BR')}] --- INICIANDO CICLO DE VERIFICAÇÃO NO ERP ---`);

        let erpCheckErrors = []; // NOVO: Coleta erros durante a verificação do ERP
        let totalErpNotasEncontradas = 0;
        let totalNovasNotasIntegradas = 0;

        try {
            const empresas = await empresaModel.findAllActive();
            console.log(`Encontradas ${empresas.length} empresas ativas para verificação.`);

            for (const empresa of empresas) {
                try {
                    // const dataDeBusca = '2025-08-01'; // <<<<< Mantenha esta linha para testar com data específica
                    const dataDeBusca = new Date().toISOString().slice(0, 10);

                    const notasDoErp = await erpService.fetchNotas(empresa, dataDeBusca);
                    totalErpNotasEncontradas += notasDoErp.length; // Soma ao total

                    let novasNotasIntegradasEmpresa = 0; // Contador por empresa

                    for (const nota of notasDoErp) {
                        const jaExiste = await averbacaoLogModel.findExisting(String(nota.codNumNota), empresa.id);
                        if (!jaExiste) {
                            await averbacaoLogModel.create({
                                id_empresa: empresa.id,
                                numero_nota: nota.codNumNota,
                                representante: nota.codRepresentante,
                                tipo_nota: nota.codTipoDeNota,
                                data_emissao: nota.dataEmissao
                            });
                            novasNotasIntegradasEmpresa++;
                        }
                    }
                    totalNovasNotasIntegradas += novasNotasIntegradasEmpresa; // Soma ao total geral
                    console.log(`   RESUMO para ${empresa.nome_empresa}: ${notasDoErp.length} notas encontradas no ERP para ${dataDeBusca}. ${novasNotasIntegradasEmpresa} novas notas integradas ao log.`);
                } catch (error) {
                    console.error(`   ERRO ao consultar API do ERP para a empresa ${empresa.nome_empresa}:`, error.message);
                    erpCheckErrors.push({ empresa: empresa.nome_empresa, motivo: error.message });
                }
            }
        } catch (generalErpError) {
            console.error("ERRO GERAL no ciclo de verificação do ERP:", generalErpError.message);
            erpCheckErrors.push({ empresa: 'N/A (Erro Geral)', motivo: `Erro geral na verificação do ERP: ${generalErpError.message}` });
        } finally {
            console.log(`--- CICLO DE VERIFICAÇÃO NO ERP FINALIZADO ---`);
            const processamentoSummary = await this.processarNotasPendentes(); // Chama e obtém o resumo

            // Lógica CONDICIONAL de envio de e-mail
            if (erpCheckErrors.length > 0 || processamentoSummary.notasComErro.length > 0) {
                const subject = `[Automação AT&M] ALERTA: Erros no Processamento (${new Date().toLocaleDateString('pt-BR')})`;
                let textContent = `Foram encontrados erros durante o ciclo de automação:\n\n`;

                if (erpCheckErrors.length > 0) {
                    textContent += `--- Erros na Verificação do ERP (${erpCheckErrors.length}) ---\n`;
                    erpCheckErrors.forEach(e => textContent += `  - Empresa: ${e.empresa}, Motivo: ${e.motivo}\n`);
                    textContent += `\n`;
                }

                if (processamentoSummary.notasComErro.length > 0) {
                    textContent += `--- Erros na Averbação/Processamento de Notas (${processamentoSummary.notasComErro.length}) ---\n`;
                    processamentoSummary.notasComErro.forEach(n => textContent += `  - Nota: ${n.numero_nota}, Motivo: ${n.motivo}\n`);
                    textContent += `\n`;
                }

                textContent += `\nResumo Geral do Processamento de Notas:\n`;
                textContent += `Total de notas consideradas para averbação: ${processamentoSummary.totalNotasConsideradas}\n`;
                textContent += `Notas Averbadas com Sucesso: ${processamentoSummary.notasAverbadas.length}\n`;
                processamentoSummary.notasAverbadas.forEach(n => textContent += `  - ${n.numero_nota} (Protocolo: ${n.protocolo})\n`);
                textContent += `Notas Ignoradas por Regra: ${processamentoSummary.notasIgnoradas.length}\n`;
                processamentoSummary.notasIgnoradas.forEach(n => textContent += `  - ${n.numero_nota} (Motivo: ${n.motivo})\n`);

                await notificationService.sendEmail(subject, textContent);
            } else {
                // Nenhuma nota com erro, nem na verificação do ERP, nem no processamento.
                // NENHUM E-MAIL É ENVIADO NESTE CASO (processo normal/sucesso).
                console.log(`   Ciclo de automação concluído sem erros. Nenhuma notificação por e-mail enviada.`);
                console.log(`   Resumo: ${totalNovasNotasIntegradas} novas notas integradas ao log. ${processamentoSummary.notasAverbadas.length} notas averbadas.`);
            }
        }
    },

    start() {
        console.log(`\nAutomação configurada para rodar a cada 1 minuto.`);
        this.checarNotasParaTodasEmpresas();
        const TRES_HORAS = 3 * 60 * 60 * 1000;
        setInterval(() => this.checarNotasParaTodasEmpresas(), TRES_HORAS);
    }
};

module.exports = automationService;
