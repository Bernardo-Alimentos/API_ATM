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
     * Busca uma empresa específica pelo ID.
     * @param {number} id - O ID da empresa.
     * @returns {Promise<Object|null>} A empresa encontrada ou null se não existir.
     */
    findById: async (id) => {
        const res = await pool.query('SELECT * FROM empresas WHERE id = $1', [id]);
        return res.rows[0];
    },

    /**
     * Cria uma nova empresa no banco de dados.
     * @param {Object} data - Os dados da nova empresa.
     * @returns {Promise<Object>} A empresa criada.
     */
    create: async (data) => {
        const { nome_empresa, cnpj, empresa_id_erp, tipos_nota_considerar, representantes_ignorar, excecao_representante, excecao_tipo_nota, ativo } = data;
        const res = await pool.query(
            `INSERT INTO empresas (nome_empresa, cnpj, empresa_id_erp, tipos_nota_considerar, representantes_ignorar, excecao_representante, excecao_tipo_nota, ativo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [nome_empresa, cnpj, empresa_id_erp, tipos_nota_considerar, representantes_ignorar, excecao_representante, excecao_tipo_nota, ativo]
        );
        return res.rows[0];
    },

    /**
     * Atualiza os dados de uma empresa específica no banco de dados.
     * @param {number} id - O ID da empresa a ser atualizada.
     * @param {Object} data - Os novos dados da empresa.
     * @returns {Promise<Object|null>} A empresa atualizada ou null se não for encontrada.
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
    },

    /**
     * Deleta uma empresa do banco de dados.
     * @param {number} id - O ID da empresa a ser deletada.
     * @returns {Promise<boolean>} True se a empresa foi deletada com sucesso, false caso contrário.
     */
    delete: async (id) => {
        const res = await pool.query('DELETE FROM empresas WHERE id = $1 RETURNING id', [id]);
        return res.rowCount > 0;
    }
};

module.exports = empresaModel;