/*
================================================================================
ARQUIVO: /routes/apiRoutes.js
INSTRUÇÕES: Define os endereços da nossa API.
================================================================================
*/
const express = require('express');
const router = express.Router();

// Importa os controllers
const dashboardController = require('../controllers/dashboardController');
const consultaController = require('../controllers/consultaController');
const configController = require('../controllers/configController'); // Certifique-se que está importado

// --- Rotas do Dashboard ---
// GET /api/dashboard
router.get('/dashboard', dashboardController.getDashboardData);

// --- Rotas de Consulta ---
// GET /api/consulta
router.get('/consulta', consultaController.getResultados);

// --- Rotas de Configuração (CRUD de Empresas) ---
// Note que as rotas aqui estão completas para o CRUD
// GET /api/config/empresas             - Lista todas as empresas
router.get('/config/empresas', configController.getEmpresas);
// GET /api/config/empresas/:id         - Obter uma empresa por ID
router.get('/config/empresas/:id', configController.getEmpresaById); // Nova rota
// POST /api/config/empresas            - Cria uma nova empresa
router.post('/config/empresas', configController.createEmpresa); // Nova rota
// PUT /api/config/empresas/:id         - Atualizar uma empresa existente
router.put('/config/empresas/:id', configController.updateEmpresa);
// DELETE /api/config/empresas/:id      - Deletar uma empresa
router.delete('/config/empresas/:id', configController.deleteEmpresa); // Nova rota


module.exports = router;