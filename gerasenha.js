// generate_hash.js
const bcrypt = require('bcrypt');

const senhaOriginal = 'Ba#@!3358'; // Sua senha de teste
const saltRounds = 10; // Custo de processamento do hash (10 é um bom padrão)

bcrypt.hash(senhaOriginal, saltRounds, (err, hash) => {
    if (err) {
        console.error('Erro ao gerar hash:', err);
        return;
    }
    console.log('Senha original:', senhaOriginal);
    console.log('Hash gerado:', hash);
    console.log('\nUse este HASH para atualizar o campo senha_hash no seu MySQL.');
});