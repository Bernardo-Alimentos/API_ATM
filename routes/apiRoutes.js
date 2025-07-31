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
const configController = require('../controllers/configController');

// --- Rotas do Dashboard ---
// GET /api/dashboard
router.get('/dashboard', dashboardController.getDashboardData);

// --- Rotas de Consulta ---
// GET /api/consulta
router.get('/consulta', consultaController.getResultados);
// POST /api/consulta/reenviar-notas - Nova rota para reenvio manual
router.post('/consulta/reenviar-notas', consultaController.reenviarNotas);

// --- Rotas de Configuração (CRUD de Empresas) ---
// GET /api/config/empresas             - Listar todas as empresas
router.get('/config/empresas', configController.getEmpresas);
// GET /api/config/empresas/:id         - Obter uma empresa por ID
router.get('/config/empresas/:id', configController.getEmpresaById);
// POST /api/config/empresas            - Criar uma nova empresa
router.post('/api/config/empresas', configController.createEmpresa);
// PUT /api/config/empresas/:id         - Atualizar uma empresa existente
router.put('/config/empresas/:id', configController.updateEmpresa);
// DELETE /api/config/empresas/:id      - Deletar uma empresa
router.delete('/api/config/empresas/:id', configController.deleteEmpresa);


module.exports = router;
