/*
================================================================================
ARQUIVO: /routes/apiRoutes.js
INSTRUÇÕES: Define os endereços da nossa API.
================================================================================
*/
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Rota para o Dashboard
// GET /api/dashboard
router.get('/dashboard', dashboardController.getDashboardData);

// (Futuras rotas de consulta e config virão aqui)

module.exports = router;
