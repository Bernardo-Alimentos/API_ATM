/*
================================================================================
ARQUIVO: server.js (Arquivo Principal - Versão Limpa)
INSTRUÇÕES: Este é o nosso novo ponto de entrada.
================================================================================
*/
require('dotenv').config();
const express = require('express');
const path = require('path');
const pool = require('./config/db');

// Importa as rotas
const apiRoutes = require('./routes/apiRoutes');
const viewRoutes = require('./routes/viewRoutes');

// Importa o serviço de automação
const automationService = require('./services/automationService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json()); // ADICIONE ESTA LINHA AQUI PARA HABILITAR O PARSEAMENTO DE JSON
app.use(express.static(path.join(__dirname, 'public')));

// Usar as Rotas
app.use('/api', apiRoutes);
app.use('/', viewRoutes);

// Iniciar o Servidor
app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    try {
        const client = await pool.connect();
        console.log('Conexão com o banco de dados PostgreSQL estabelecida com sucesso.');
        client.release();
        
        automationService.start();

    } catch (error) {
        console.error('ERRO FATAL: Não foi possível conectar ao banco de dados. A automação não pode continuar.', error.message);
    }
});