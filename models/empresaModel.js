/*
================================================================================
ARQUIVO: /models/empresaModel.js
INSTRUÇÕES: Funções para interagir com a tabela 'empresas'.
================================================================================
*/
const pool = require('../config/db');

const empresaModel = {
    /**
     * Busca todas as empresas ativas no banco de dados para a automação.
     * @returns {Promise<Array>} Uma promessa que resolve para uma lista de empresas ativas.
     */
    findAllActive: async () => {
        const res = await pool.query('SELECT * FROM empresas WHERE ativo = TRUE');
        return res.rows;
    },

    /**
     * Busca TODAS as empresas para a tela de configuração.
     * @returns {Promise<Array>} Uma promessa que resolve para uma lista de todas as empresas.
     */
    findAll: async () => {
        const res = await pool.query('SELECT * FROM empresas ORDER BY id ASC');
        return res.rows;
    },

    /**
     * Atualiza os dados de uma empresa específica no banco de dados.
     * @param {number} id - O ID da empresa a ser atualizada.
     * @param {Object} data - Os novos dados da empresa.
     * @returns {Promise<Object>} A empresa atualizada.
     */
    update: async (id, data) => {
        const { nome_empresa, cnpj, empresa_id_erp, tipos_nota_considerar, representantes_ignorar, excecao_representante, excecao_tipo_nota, ativo } = data;
        
        const res = await pool.query(
            `UPDATE empresas SET 
                nome_empresa = $1, 
                cnpj = $2, 
                empresa_id_erp = $3, 
                tipos_nota_considerar = $4, 
                representantes_ignorar = $5, 
                excecao_representante = $6, 
                excecao_tipo_nota = $7, 
                ativo = $8 
            WHERE id = $9 RETURNING *`,
            [nome_empresa, cnpj, empresa_id_erp, tipos_nota_considerar, representantes_ignorar, excecao_representante, excecao_tipo_nota, ativo, id]
        );
        return res.rows[0];
    }
};

module.exports = empresaModel;
