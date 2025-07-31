// services/atmService.js
const axios = require('axios');
const https = require('https'); // Necessário para rejectUnauthorized

let authToken = null; // Variável para armazenar o token. Pode ser melhorada com um cache ou redis.

const atmService = {
    // URL base da API da AT&M. Em homologação, é a mesma para Auth e averbação.
    // Lembre-se de configurar as URLs de homologação/produção em seu .env
    ATM_API_BASE_URL: process.env.ATM_API_BASE_URL || 'https://webserver.averba.com.br/rest',

    // Credenciais para autenticação na AT&M (usuário, senha, códigoatm)
    // ATENÇÃO: Em produção, estas deveriam vir de um gerenciador de segredos (Secrets Manager, etc.)
    ATM_USER: process.env.ATM_USER,
    ATM_PASSWORD: process.env.ATM_PASSWORD,
    ATM_CODIGO_ATM: process.env.ATM_CODIGO_ATM,

    // Agente HTTPS para aceitar certificados autoassinados em ambiente de teste, se necessário.
    // Em produção, isso geralmente deve ser 'true' ou o certificado deve ser válido.
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),

    /**
     * Autentica na API da AT&M e obtém um novo Token.
     * @returns {Promise<string>} O Token Bearer.
     * @throws {Error} Se a autenticação falhar.
     */
    authenticate: async () => {
        console.log('  ATM Service: Solicitando novo Token de autenticação...');
        try {
            const response = await axios.post(
                `${atmService.ATM_API_BASE_URL}/Auth`,
                {
                    usuario: atmService.ATM_USER,
                    senha: atmService.ATM_PASSWORD,
                    codigoatm: atmService.ATM_CODIGO_ATM
                },
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    httpsAgent: atmService.httpsAgent
                }
            );

            if (response.data && response.data.Bearer) {
                authToken = response.data.Bearer; // Armazena o token
                console.log('  ATM Service: Token obtido com sucesso.');
                return authToken;
            } else {
                throw new Error('Formato de resposta de autenticação inesperado da AT&M.');
            }
        } catch (error) {
            console.error('  ATM Service: Erro na autenticação:', error.message || error);
            throw new Error(`Falha na autenticação da AT&M: ${error.response?.data?.message || error.message}`);
        }
    },

    /**
     * Retorna o Token atual, autenticando se necessário.
     * @returns {Promise<string>} O Token Bearer válido.
     */
    getAuthToken: async () => {
        // Implementação futura: Adicionar lógica para verificar expiração do token antes de reautenticar.
        // Por enquanto, sempre reautentica, ou você pode adicionar um timer/flag de validade.
        if (!authToken) {
            await atmService.authenticate();
        }
        return authToken;
    },

    /**
     * Envia o XML de uma NF-e para averbação na AT&M.
     * @param {string} nfeXml - O XML da NF-e protocolada pela SEFAZ.
     * @returns {Promise<object>} O objeto de resposta da averbação da AT&M.
     * @throws {Error} Se a averbação falhar.
     */
    averbarNFe: async (nfeXml) => {
        const token = await atmService.getAuthToken(); // Garante que temos um token válido
        console.log('  ATM Service: Enviando NF-e para averbação...');
        try {
            const response = await axios.post(
                `${atmService.ATM_API_BASE_URL}/NFe`, // Endpoint para NF-e
                nfeXml, // O corpo da requisição é o XML puro
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json', // Ou 'application/xml', conforme o retorno desejado
                        'Content-Type': 'application/xml' // O XML é enviado como application/xml
                    },
                    httpsAgent: atmService.httpsAgent
                }
            );

            if (response.data.Erros) { // A AT&M retorna 'Erros' mesmo em 200 OK para erros de negócio
                const errorMessage = response.data.Erros.Erro.map(e => `${e.Codigo}: ${e.Descricao}`).join('; ');
                console.error('  ATM Service: Erro de averbação retornado pela AT&M:', errorMessage);
                // Você pode querer lançar um erro específico aqui ou retornar a resposta de erro completa
                return { success: false, data: response.data, message: errorMessage };
            }

            console.log('  ATM Service: NF-e averbada com sucesso.');
            return { success: true, data: response.data };

        } catch (error) {
            console.error('  ATM Service: Erro ao averbar NF-e:', error.message || error);
            // Captura erros de rede ou de status HTTP (ex: 401 para token expirado)
            if (error.response && error.response.status === 401 && error.response.data.Codigo === '915') {
                console.log('  ATM Service: Token expirado. Tentando reautenticar...');
                authToken = null; // Invalida o token atual
                // Tentar reautenticar e re-enviar a requisição (lógica mais complexa, pode ser no automationService)
                throw new Error('Token expirado. Reautentique e tente novamente.');
            }
            throw new Error(`Falha na averbação da AT&M: ${error.response?.data?.message || error.message}`);
        }
    },

    // Adicione aqui outras funções como averbarCTE, cancelarNFe, etc.
};

module.exports = atmService;