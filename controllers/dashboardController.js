/*
================================================================================
ARQUIVO: /controllers/dashboardController.js
INSTRUÇÕES: A lógica que a rota do dashboard irá executar.
================================================================================
*/
const averbacaoLogModel = require('../models/averbacaoLogModel');

const dashboardController = {
    async getDashboardData(req, res) {
        try {
            const data = await averbacaoLogModel.getDashboardData();
            res.json(data);
        } catch (error) {
            console.error("Erro no dashboardController:", error);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    }
};

module.exports = dashboardController;