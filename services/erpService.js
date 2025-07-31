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

            console.log(`   ERP Service: Buscando página ${pagina} para ${empresa.nome_empresa} (ID ERP: ${empresa.empresa_id_erp}) para data ${dataDeBusca}...`);

            const requestConfig = {
                method: 'get',
                url: url,
                headers: {
                    'Authorization': process.env.ERP_API_TOKEN,
                    'empresa': String(empresa.empresa_id_erp), // Usar empresa_id_erp aqui
                    'accept': 'application/json',
                    'User-Agent': 'axios/1.6.8'
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }) 
            };

            try {
                const response = await axios(requestConfig);
                const notasDaPagina = response.data.data || [];
                if (Array.isArray(notasDaPagina) && notasDaPagina.length > 0) {
                    todasAsNotas.push(...notasDaPagina);
                }
                continuationToken = response.data.continuationToken;
                pagina++;
            } catch (error) {
                console.error(`   ERP Service: Erro ao buscar página ${pagina} para ${empresa.nome_empresa}:`, error.message || error);
                if (error.response) {
                    console.error('   ERP Service: Detalhes do erro da API do ERP:', error.response.data);
                    console.error('   ERP Service: Status HTTP:', error.response.status);
                    console.error('   ERP Service: Headers da resposta:', error.response.headers);
                }
                throw error;
            }
        } while (continuationToken);

        return todasAsNotas;
    },

    /**
     * Busca o XML de uma nota fiscal específica no ERP.
     * @param {number} empresaIdErp - O ID da empresa no ERP (numérico).
     * @param {string} nomeEmpresa - Nome da empresa (para logs).
     * @param {string} dataEmissao - Data de emissão da nota no formato YYYY-MM-DD.
     * @param {string} codNota - Código/Número da nota fiscal.
     * @returns {Promise<string|null>} O XML da nota como string, ou null se não encontrado.
     * @throws {Error} Se a consulta falhar.
     */
    fetchNotaXML: async (empresaIdErp, nomeEmpresa, dataEmissao, codNota) => {
        // Log para depuração dos parâmetros recebidos
        console.log(`   ERP Service: Parâmetros recebidos para fetchNotaXML:`);
        console.log(`     - empresaIdErp: ${empresaIdErp}`);
        console.log(`     - nomeEmpresa: ${nomeEmpresa}`);
        console.log(`     - dataEmissao: ${dataEmissao}`);
        console.log(`     - codNota: ${codNota}`);

        // CONSTRUÇÃO DA URL COM OS PARÂMETROS NA ORDEM CORRETA
        const url = `${process.env.ERP_API_URL}/notaFiscalXML?dataEmissao=${dataEmissao}&codNota=${codNota}`;

        console.log(`   ERP Service: Buscando XML para a nota ${codNota} (Empresa ID: ${empresaIdErp}) em ${dataEmissao}...`);
        console.log(`   ERP Service: URL da requisição XML: ${url}`);

        const requestConfig = {
            method: 'get',
            url: url,
            headers: {
                'Authorization': process.env.ERP_API_TOKEN,
                'empresa': String(empresaIdErp), // Usar empresaIdErp aqui
                'accept': 'application/json',
                'User-Agent': 'axios/1.6.8'
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        };

        try {
            const response = await axios(requestConfig);
            // CORRIGIDO: Agora verifica se o XML está em 'response.data.arquivo'
            if (response.data && response.data.arquivo) { 
                return response.data.arquivo; 
            } else if (response.data && response.data.xmlContent) { // Mantém a verificação anterior como fallback
                return response.data.xmlContent; 
            } else if (response.data && response.data.data && response.data.data.xmlContent) { // Mantém a verificação anterior como fallback
                return response.data.data.xmlContent;
            } else {
                console.warn(`   ERP Service: XML não encontrado na resposta para nota ${codNota}. Estrutura da resposta inesperada:`, response.data);
                return null;
            }
        } catch (error) {
            console.error(`   ERP Service: Erro ao buscar XML para a nota ${codNota}:`, error.message || error);
            if (error.response) {
                console.error('   ERP Service: Detalhes do erro da API do ERP (XML):', error.response.data);
                console.error('   ERP Service: Status HTTP (XML):', error.response.status);
                console.error('   ERP Service: Headers da requisição (XML):', requestConfig.headers);
                console.error('   ERP Service: URL da requisição (XML):', requestConfig.url);
            }
            if (error.response && (error.response.status === 404 || error.response.status === 204)) {
                console.warn(`   ERP Service: XML para nota ${codNota} não encontrado (HTTP Status: ${error.response.status}).`);
                return null;
            }
            throw new Error(`Falha ao obter XML do ERP para nota ${codNota}: ${error.message}`);
        }
    }
};

module.exports = erpService;
