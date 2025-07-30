/*
================================================================================
ARQUIVO: /controllers/consultaController.js
INSTRUÇÕES: Lógica para a tela de consulta, que recebe os filtros e
             pede os dados ao Model.
================================================================================
*/
const averbacaoLogModel = require('../models/averbacaoLogModel');

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
    }
};

module.exports = consultaController;
