/*
================================================================================
ARQUIVO: /services/erpService.js
INSTRUÇÕES: Lógica isolada para se comunicar com a API do ERP.
================================================================================
*/
const axios = require('axios');
const https = require('https');

const erpService = {
    fetchNotas: async (empresa, dataDeBusca) => {
        let todasAsNotas = [];
        let continuationToken = null;
        let pagina = 1;

        do {
            // CORREÇÃO: Monta a URL com data de início e fim para buscar um único dia.
            let url = `${process.env.ERP_API_URL}/notaFiscalSaida?situacao=2&tipoNota=${empresa.tipos_nota_considerar}&dataEmissaoInicio=${dataDeBusca}&dataEmissaoFim=${dataDeBusca}`;
            
            if (continuationToken) {
                url += `&continuationToken=${continuationToken}`;
            }

            console.log(`   Buscando página ${pagina} para ${empresa.nome_empresa}...`);

            const requestConfig = {
                method: 'get',
                url: url,
                headers: {
                    'Authorization': process.env.ERP_API_TOKEN,
                    'empresa': String(empresa.empresa_id_erp),
                    'accept': 'application/json',
                    'User-Agent': 'axios/1.6.8'
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            };

            const response = await axios(requestConfig);
            const notasDaPagina = response.data.data || [];
            if (Array.isArray(notasDaPagina) && notasDaPagina.length > 0) {
                todasAsNotas.push(...notasDaPagina);
            }
            continuationToken = response.data.continuationToken;
            pagina++;
        } while (continuationToken);

        return todasAsNotas;
    }
};

module.exports = erpService;
