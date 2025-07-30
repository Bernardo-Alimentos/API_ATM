/*
================================================================================
ARQUIVO: server.js (Arquivo Principal - Versão Limpa)
INSTRUÇÕES: Este é o nosso novo ponto de entrada.
================================================================================
*/
require('dotenv').config();
const express = require('express');
const path = require('path');
const pool = require('./config/db'); // Importa a conexão do banco

// Importa as rotas
const apiRoutes = require('./routes/apiRoutes');
const viewRoutes = require('./routes/viewRoutes');

// Importa o serviço de automação
const automationService = require('./services/automationService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.static(path.join(__dirname, 'public'))); // Servir arquivos estáticos

// Usar as Rotas
app.use('/api', apiRoutes); // Todas as rotas de API começarão com /api
app.use('/', viewRoutes);   // Rotas que servem as páginas

// Iniciar o Servidor
app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    try {
        // Testa a conexão com o banco
        const client = await pool.connect();
        console.log('Conexão com o banco de dados PostgreSQL estabelecida com sucesso.');
        client.release();
        
        // Inicia o loop de automação
        automationService.start();

    } catch (error) {
        console.error('ERRO FATAL: Não foi possível conectar ao banco de dados. A automação não pode continuar.', error.message);
    }
});
