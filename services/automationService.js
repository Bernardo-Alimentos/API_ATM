/*
================================================================================
ARQUIVO: /services/automationService.js
INSTRUÇÕES: O coração da automação, com os loops e a lógica de negócio.
================================================================================
*/
const empresaModel = require('../models/empresaModel');
const averbacaoLogModel = require('../models/averbacaoLogModel');
const erpService = require('./erpService');

const automationService = {
    async processarNotasPendentes() {
        console.log(`\n[${new Date().toLocaleString('pt-BR')}] --- INICIANDO PROCESSAMENTO DE REGRAS ---`);
        const notasParaProcessar = await averbacaoLogModel.findPending();

        if (notasParaProcessar.length > 0) {
            console.log(`   Encontradas ${notasParaProcessar.length} notas para aplicar regras de negócio.`);
        }

        for (const nota of notasParaProcessar) {
            const representantesIgnorar = (nota.representantes_ignorar || '').split(',').map(s => s.trim()).filter(Boolean);
            const repString = String(nota.representante);
            const tipoNotaString = String(nota.tipo_nota);

            let deveIgnorar = false;
            if (representantesIgnorar.includes(repString)) {
                deveIgnorar = true;
                if (repString === nota.excecao_representante && tipoNotaString === nota.excecao_tipo_nota) {
                    deveIgnorar = false;
                }
            }

            if (deveIgnorar) {
                console.log(`   -> Nota ${nota.numero_nota} IGNORADA pela regra do representante ${repString}.`);
                await averbacaoLogModel.updateStatus(nota.id, 'IGNORADA_REGRA', `Representante ${repString} está na lista para ignorar.`);
            } else {
                console.log(`   -> Nota ${nota.numero_nota} APROVADA no filtro. Pronta para envio.`);
                // AQUI ENTRARÁ A LÓGICA PARA PEGAR O XML E ENVIAR PARA AT&M
                await averbacaoLogModel.updateStatus(nota.id, 'AGUARDANDO_ENVIO_ATM', 'Aprovada no filtro de regras.');
            }
        }
        console.log(`--- FIM DO PROCESSAMENTO DE REGRAS ---`);
    },

    async checarNotasParaTodasEmpresas() {
        console.log(`\n[${new Date().toLocaleString('pt-BR')}] --- INICIANDO CICLO DE VERIFICAÇÃO NO ERP ---`);
        try {
            const empresas = await empresaModel.findAllActive();
            console.log(`Encontradas ${empresas.length} empresas ativas para verificação.`);

            for (const empresa of empresas) {
                try {
                    // CORREÇÃO: Define a data de busca. Para produção, usaria a data atual.
                    // const hoje = new Date().toISOString().slice(0, 10);
                    const dataDeBusca = '2025-05-15'; // Mantendo a data de teste

                    const notasDoErp = await erpService.fetchNotas(empresa, dataDeBusca);
                    let novasNotasIntegradas = 0;

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
                            novasNotasIntegradas++;
                        }
                    }
                    console.log(`   RESUMO para ${empresa.nome_empresa}: ${notasDoErp.length} notas encontradas. ${novasNotasIntegradas} novas notas integradas ao log.`);
                } catch (error) {
                    console.error(`   ERRO ao consultar API para a empresa ${empresa.nome_empresa}:`, error.message);
                }
            }
        } catch (error) {
            console.error("ERRO GERAL no ciclo de verificação:", error.message);
        } finally {
            console.log(`--- CICLO DE VERIFICAÇÃO NO ERP FINALIZADO ---`);
            await this.processarNotasPendentes();
        }
    },

    start() {
        console.log(`\nAutomação configurada para rodar a cada 10 minutos.`);
        this.checarNotasParaTodasEmpresas(); // Roda uma vez ao iniciar
        const DEZ_MINUTOS = 10 * 60 * 1000;
        setInterval(() => this.checarNotasParaTodasEmpresas(), DEZ_MINUTOS);
    }
};

module.exports = automationService;
