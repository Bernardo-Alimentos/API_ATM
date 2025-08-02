/*
================================================================================
ARQUIVO: testEmail.js
INSTRUÇÕES: Script autônomo para testar a configuração de envio de e-mail.
            Execute via: node testEmail.js
================================================================================
*/
require('dotenv').config(); // Carrega as variáveis de ambiente do .env
const notificationService = require('./services/notificationService'); // Importa o serviço de notificação

async function runEmailTest() {
    console.log('--- INICIANDO TESTE DE ENVIO DE E-MAIL ---');
    
    // Verificações básicas das variáveis de ambiente
    if (!process.env.EMAIL_HOST) {
        console.error('ERRO: EMAIL_HOST não configurado no .env');
        return;
    }
    if (!process.env.EMAIL_USER) {
        console.error('ERRO: EMAIL_USER não configurado no .env');
        return;
    }
    if (!process.env.EMAIL_PASS) {
        console.error('ERRO: EMAIL_PASS não configurado no .env');
        return;
    }
    if (!process.env.EMAIL_RECIPIENTS) {
        console.error('ERRO: EMAIL_RECIPIENTS não configurado no .env');
        return;
    }
    if (!process.env.EMAIL_FROM) {
        console.warn('AVISO: EMAIL_FROM não configurado no .env. Usará EMAIL_USER como remetente.');
    }

    const testSubject = '[TESTE AUTOMAÇÃO AT&M] Teste de Envio de E-mail';
    const testText = `Este é um e-mail de teste enviado pela sua aplicação de automação AT&M.\n\nData do teste: ${new Date().toLocaleString('pt-BR')}`;
    const testHtml = `
        <p>Este é um e-mail de teste enviado pela sua aplicação de automação AT&M.</p>
        <p><b>Data do teste:</b> ${new Date().toLocaleString('pt-BR')}</p>
        <p>Se você recebeu este e-mail, a configuração SMTP está funcionando!</p>
    `;

    try {
        const success = await notificationService.sendEmail(testSubject, testText, testHtml);
        if (success) {
            console.log('\n--- TESTE DE ENVIO DE E-MAIL CONCLUÍDO COM SUCESSO ---');
            console.log('Verifique a caixa de entrada (e spam) do(s) destinatário(s) configurado(s).');
        } else {
            console.error('\n--- TESTE DE ENVIO DE E-MAIL FALHOU ---');
            console.error('Verifique os logs acima para detalhes do erro. As credenciais SMTP no .env podem estar incorretas ou o servidor de e-mail pode estar inacessível.');
        }
    } catch (error) {
        console.error('\n--- ERRO CRÍTICO NO SCRIPT DE TESTE DE E-MAIL ---');
        console.error('Um erro inesperado ocorreu:', error.message);
    }
}

runEmailTest();
