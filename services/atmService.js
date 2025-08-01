// services/atmService.js
const axios = require('axios');
const https = require('https');

let authToken = null; // Variável para armazenar o token.

const atmService = {
    // URL base da API da AT&M.
    ATM_API_BASE_URL: process.env.ATM_API_BASE_URL || 'https://webserver.averba.com.br/rest',

    // Credenciais para autenticação na AT&M
    ATM_USER: process.env.ATM_USER,
    ATM_PASSWORD: process.env.ATM_PASSWORD,
    ATM_CODIGO_ATM: process.env.ATM_CODIGO_ATM,

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
                authToken = response.data.Bearer;
                console.log('  ATM Service: Token obtido com sucesso.');
                return authToken;
            } else {
                throw new Error('Formato de resposta de autenticação inesperado da AT&M.');
            }
        } catch (error) {
            console.error('  ATM Service: Erro na autenticação:', error.message || error);
            if (error.response) {
                console.error('  ATM Service: Detalhes do erro da API da AT&M (Auth):', JSON.stringify(error.response.data, null, 2)); // MODIFICADO: Stringify para ver o objeto completo
                console.error('  ATM Service: Status HTTP (Auth):', error.response.status);
            }
            throw new Error(`Falha na autenticação da AT&M: ${error.response?.data?.message || error.message}`);
        }
    },

    /**
     * Retorna o Token atual, autenticando se necessário.
     * @returns {Promise<string>} O Token Bearer válido.
     */
    getAuthToken: async () => {
        if (!authToken) {
            await atmService.authenticate();
        }
        return authToken;
    },

    /**
     * Envia o XML de uma NF-e para averbação na AT&M.
     * @param {string} nfeXml - O XML da NF-e protocolada pela SEFAZ (nfeProc completo).
     * @returns {Promise<object>} O objeto de resposta da averbação da AT&M.
     * @throws {Error} Se a averbação falhar.
     */
    averbarNFe: async (nfeXml) => {
        const token = await atmService.getAuthToken();
        console.log('  ATM Service: Enviando NF-e para averbação...');
        try {
            const response = await axios.post(
                `${atmService.ATM_API_BASE_URL}/NFe`,
                nfeXml, // O corpo da requisição é o XML puro (nfeProc completo)
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json', // Ou 'application/xml', conforme o retorno desejado
                        'Content-Type': 'application/xml' // O XML é enviado como application/xml
                    },
                    httpsAgent: atmService.httpsAgent
                }
            );

            // A AT&M pode retornar 'Erros' no corpo da resposta mesmo com status 200 OK para erros de negócio
            if (response.data && response.data.Erros) { 
                const errorMessage = response.data.Erros.Erro.map(e => `${e.Codigo}: ${e.Descricao}`).join('; ');
                console.error('  ATM Service: Erro de averbação retornado pela AT&M (no corpo da resposta):', errorMessage);
                return { success: false, data: response.data, message: errorMessage };
            }

            console.log('  ATM Service: NF-e averbada com sucesso.');
            return { success: true, data: response.data };

        } catch (error) {
            console.error('  ATM Service: Erro ao averbar NF-e:', error.message || error);
            if (error.response) {
                // MODIFICADO: Usar JSON.stringify para imprimir o objeto completo do erro da AT&M
                console.error('  ATM Service: Detalhes do erro da API da AT&M (Averbação):', JSON.stringify(error.response.data, null, 2)); 
                console.error('  ATM Service: Status HTTP (Averbação):', error.response.status);
                console.error('  ATM Service: Headers da requisição (Averbação):', error.config.headers);
                console.error('  ATM Service: URL da requisição (Averbação):', error.config.url);
            }
            // Tratar erro de Token expirado para tentar reautenticar e re-enviar
            if (error.response && error.response.status === 401 && error.response.data && error.response.data.Codigo === '915') {
                console.log('  ATM Service: Token expirado. Reautentique e tente novamente.');
                authToken = null; // Invalida o token atual
                throw new Error('Token expirado. Reautentique e tente novamente.');
            }
            throw new Error(`Falha na averbação da AT&M: ${error.response?.data?.message || error.message}`);
        }
    },

    // Adicione aqui outras funções como averbarCTE, cancelarNFe, etc.
};

module.exports = atmService;
