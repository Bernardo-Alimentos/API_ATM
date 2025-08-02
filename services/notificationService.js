/*
================================================================================
ARQUIVO: /services/notificationService.js
INSTRUÇÕES: Serviço para enviar notificações por e-mail.
================================================================================
*/
const nodemailer = require('nodemailer');
require('dotenv').config(); // Garante que as variáveis de ambiente sejam carregadas

const notificationService = {
    // Configurações do transportador de e-mail (SMTP)
    // ATENÇÃO: Preencha estas variáveis no seu arquivo .env
    transporter: nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true', // Use 'true' para SSL/TLS (porta 465), 'false' para STARTTLS (porta 587)
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            // Apenas para ambientes de desenvolvimento/teste com certificados autoassinados.
            // Em produção, isso deve ser 'true' ou removido se o certificado for válido.
            rejectUnauthorized: process.env.EMAIL_REJECT_UNAUTHORIZED === 'false' ? false : true
        }
    }),

    /**
     * Envia um e-mail de notificação.
     * @param {string} subject - O assunto do e-mail.
     * @param {string} textContent - O conteúdo do e-mail em texto puro.
     * @param {string} htmlContent - O conteúdo do e-mail em HTML (opcional, se for mais formatado).
     * @param {string} [recipients] - Endereços de e-mail dos destinatários, separados por vírgula.
     * Se não fornecido, usa EMAIL_RECIPIENTS do .env.
     */
    sendEmail: async (subject, textContent, htmlContent, recipients = process.env.EMAIL_RECIPIENTS) => {
        if (!recipients) {
            console.warn('Notification Service: Nenhum destinatário configurado para o e-mail. E-mail não enviado.');
            return;
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER, // Remetente do e-mail
            to: recipients,
            subject: subject,
            text: textContent,
            html: htmlContent || textContent, // Usa HTML se fornecido, senão usa texto puro
        };

        try {
            console.log(`Notification Service: Tentando enviar e-mail para ${recipients} com assunto "${subject}"...`);
            const info = await notificationService.transporter.sendMail(mailOptions);
            console.log('Notification Service: E-mail enviado com sucesso:', info.messageId);
            return true;
        } catch (error) {
            console.error('Notification Service: Erro ao enviar e-mail:', error.message);
            // Se for um erro de autenticação, logar mais detalhes
            if (error.code === 'EAUTH' || error.code === 'EENVELOPE') {
                console.error('Notification Service: Verifique as credenciais SMTP no .env (EMAIL_USER, EMAIL_PASS, EMAIL_HOST, EMAIL_PORT).');
            }
            return false;
        }
    }
};

module.exports = notificationService;
