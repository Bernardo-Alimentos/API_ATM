/*
================================================================================
ARQUIVO: /services/erpService.js
INSTRUÇÕES: Lógica isolada para se comunicar com a API do ERP.
================================================================================
*/
const axios = require('axios');
const https = require('https');

const erpService = {
    /**
     * Busca notas fiscais do ERP para uma empresa e data específicas.
     * @param {Object} empresa - Objeto da empresa com nome_empresa, tipos_nota_considerar, empresa_id_erp.
     * @param {string} dataDeBusca - Data no formato YYYY-MM-DD para buscar as notas.
     * @returns {Promise<Array>} Uma lista de notas fiscais do ERP.
     * @throws {Error} Se a consulta falhar.
     */
    fetchNotas: async (empresa, dataDeBusca) => {
        let todasAsNotas = [];
        let continuationToken = null;
        let pagina = 1;

        do {
            // Monta a URL com data de início e fim para buscar um único dia.
            // A situação '2' geralmente indica notas autorizadas/emitidas.
            let url = `${process.env.ERP_API_URL}/notaFiscalSaida?situacao=2&tipoNota=${empresa.tipos_nota_considerar}&dataEmissaoInicio=${dataDeBusca}&dataEmissaoFim=${dataDeBusca}`;
            
            if (continuationToken) {
                url += `&continuationToken=${continuationToken}`;
            }

            console.log(`   ERP Service: Buscando página ${pagina} para ${empresa.nome_empresa} (${dataDeBusca})...`);

            const requestConfig = {
                method: 'get',
                url: url,
                headers: {
                    'Authorization': process.env.ERP_API_TOKEN,
                    'empresa': String(empresa.empresa_id_erp),
                    'accept': 'application/json',
                    'User-Agent': 'axios/1.6.8' // Boa prática para identificar o cliente
                },
                // Permite requisições HTTPS para servidores com certificados autoassinados (ambiente de teste)
                httpsAgent: new https.Agent({ rejectUnauthorized: false }) 
            };

            try {
                const response = await axios(requestConfig);
                const notasDaPagina = response.data.data || []; // Assumindo que as notas estão em 'response.data.data'
                if (Array.isArray(notasDaPagina) && notasDaPagina.length > 0) {
                    todasAsNotas.push(...notasDaPagina);
                }
                continuationToken = response.data.continuationToken; // Assumindo que o token de continuação está aqui
                pagina++;
            } catch (error) {
                console.error(`   ERP Service: Erro ao buscar página ${pagina} para ${empresa.nome_empresa}:`, error.message || error);
                throw error; // Relança o erro para ser tratado no automationService
            }
        } while (continuationToken); // Continua enquanto houver um token de continuação

        return todasAsNotas;
    },

    /**
     * Busca o XML de uma nota fiscal específica no ERP.
     * @param {string} nomeEmpresa - Nome da empresa (para logs e header 'empresa').
     * @param {string} dataEmissao - Data de emissão da nota no formato YYYY-MM-DD.
     * @param {string} codNota - Código/Número da nota fiscal.
     * @returns {Promise<string|null>} O XML da nota como string, ou null se não encontrado.
     * @throws {Error} Se a consulta falhar.
     */
    fetchNotaXML: async (nomeEmpresa, dataEmissao, codNota) => {
        // URL base do ERP para buscar o XML
        const url = `${process.env.ERP_API_URL}/notaFiscalXML?dataEmissao=${dataEmissao}&codNota=${codNota}`;

        console.log(`   ERP Service: Buscando XML para a nota ${codNota} (Empresa: ${nomeEmpresa}) em ${dataEmissao}...`);

        const requestConfig = {
            method: 'get',
            url: url,
            headers: {
                'Authorization': process.env.ERP_API_TOKEN,
                'empresa': String(nomeEmpresa), // O ERP espera o nome da empresa ou o ID? Verifique sua API.
                'accept': 'application/json', // A API retorna JSON que contem o XML em uma string
                'User-Agent': 'axios/1.6.8'
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        };

        try {
            const response = await axios(requestConfig);
            // ATENÇÃO: Ajuste esta parte conforme a estrutura REAL da resposta do seu ERP.
            // O XML pode estar em 'response.data.xml', 'response.data.content', 'response.data.data.xmlContent', etc.
            if (response.data && response.data.xmlContent) { // Exemplo comum: o XML está em 'xmlContent'
                return response.data.xmlContent; 
            } else if (response.data && response.data.data && response.data.data.xmlContent) { // Outro exemplo de estrutura aninhada
                return response.data.data.xmlContent;
            } else {
                console.warn(`   ERP Service: XML não encontrado na resposta para nota ${codNota}. Estrutura da resposta inesperada:`, response.data);
                return null; // Retorna null se a estrutura do XML não for encontrada
            }
        } catch (error) {
            console.error(`   ERP Service: Erro ao buscar XML para a nota ${codNota}:`, error.message || error);
            // Se o erro for um 404 ou 204 (No Content), pode significar que o XML não existe para aquela nota
            if (error.response && (error.response.status === 404 || error.response.status === 204)) {
                console.warn(`   ERP Service: XML para nota ${codNota} não encontrado (HTTP Status: ${error.response.status}).`);
                return null;
            }
            throw new Error(`Falha ao obter XML do ERP para nota ${codNota}: ${error.message}`);
        }
    }
};

module.exports = erpService;
