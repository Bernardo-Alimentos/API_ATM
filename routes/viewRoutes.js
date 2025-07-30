/*
================================================================================
ARQUIVO: /routes/viewRoutes.js
INSTRUÇÕES: Define as rotas que servem as páginas HTML.
================================================================================
*/
const express = require('express');
const router = express.Router();
const path = require('path');

// Rota principal que serve o index.html
// GET /
router.get('/', (req, res) => {
    // path.join garante que o caminho para o arquivo funcionará em qualquer sistema operacional.
    // '..' volta uma pasta (de /routes para a raiz do projeto)
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = router;
