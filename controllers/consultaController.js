/*
================================================================================
ARQUIVO: /controllers/consultaController.js
INSTRUÇÕES: Lógica para a tela de consulta, que recebe os filtros e
             pede os dados ao Model.
================================================================================
*/
const averbacaoLogModel = require('../models/averbacaoLogModel');
const automationService = require('../services/automationService'); // Importa o automationService

const consultaController = {
    async getResultados(req, res) {
        try {
            // Os filtros virão da URL, ex: /api/consulta?status=AVERBADA
            const filters = req.query; 

            // VERIFICAÇÃO: Se nenhum filtro for enviado, retorna uma lista vazia.
            // Isso evita carregar todos os dados do banco na abertura da tela.
            if (Object.keys(filters).length === 0) {
                return res.json([]);
            }

            const data = await averbacaoLogModel.findByFilters(filters);
            res.json(data);
        } catch (error) {
            console.error("Erro no consultaController:", error);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },

    /**
     * POST /api/consulta/reenviar-notas
     * Recebe uma lista de IDs de notas e aciona o processamento delas no automationService.
     */
    async reenviarNotas(req, res) {
        try {
            const { noteIds } = req.body; // Espera um array de IDs no corpo da requisição

            if (!Array.isArray(noteIds) || noteIds.length === 0) {
                return res.status(400).json({ error: 'Nenhum ID de nota fornecido para reenvio.' });
            }

            console.log(`Requisição de reenvio manual recebida para IDs: ${noteIds.join(', ')}`);
            
            // Aciona o processamento no automationService para os IDs específicos
            await automationService.processarNotasPendentes(noteIds);

            res.json({ message: 'Processamento de reenvio acionado para as notas selecionadas.' });

        } catch (error) {
            console.error("Erro ao reenviar notas manualmente:", error);
            res.status(500).json({ error: 'Erro interno do servidor ao reenviar notas.' });
        }
    }
};

module.exports = consultaController;
