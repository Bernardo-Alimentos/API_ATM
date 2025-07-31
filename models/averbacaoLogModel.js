/*
================================================================================
ARQUIVO: /models/averbacaoLogModel.js
INSTRUÇÕES: Funções para interagir com a tabela 'averbacoes_log'.
================================================================================
*/
const pool = require('../config/db');

const averbacaoLogModel = {
    findExisting: async (numeroNota, idEmpresa) => {
        const res = await pool.query('SELECT id FROM averbacoes_log WHERE numero_nota = $1 AND id_empresa = $2', [numeroNota, idEmpresa]);
        return res.rows[0];
    },

    create: async (logData) => {
        const { id_empresa, numero_nota, representante, tipo_nota, data_emissao } = logData;
        await pool.query(
            `INSERT INTO averbacoes_log (id_empresa, numero_nota, representante, tipo_nota, data_emissao, status, mensagem_retorno) VALUES ($1, $2, $3, $4, $5, 'PENDENTE_PROCESSAMENTO', 'Nota recebida do ERP.')`,
            [id_empresa, String(numero_nota), representante, tipo_nota, data_emissao]
        );
    },
    
    findPending: async () => {
        const res = await pool.query(`
            SELECT log.*, emp.representantes_ignorar, emp.excecao_representante, emp.excecao_tipo_nota, emp.nome_empresa, emp.empresa_id_erp
            FROM averbacoes_log log
            JOIN empresas emp ON log.id_empresa = emp.id
            WHERE log.status = 'PENDENTE_PROCESSAMENTO' OR log.status = 'AGUARDANDO_ENVIO_ATM'
        `);
        return res.rows;
    },

    /**
     * Busca notas de averbação por uma lista de IDs e que estejam em status processável.
     * @param {Array<number>} ids - Um array de IDs de notas.
     * @returns {Promise<Array<Object>>} As notas encontradas.
     */
    findByIdsAndProcessableStatus: async (ids) => {
        if (!ids || ids.length === 0) {
            return [];
        }
        // Garante que os IDs são números inteiros
        const cleanIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
        if (cleanIds.length === 0) {
            return [];
        }

        // Busca notas que estão PENDENTE_PROCESSAMENTO ou AGUARDANDO_ENVIO_ATM
        // e que correspondam aos IDs fornecidos.
        const res = await pool.query(`
            SELECT log.*, emp.representantes_ignorar, emp.excecao_representante, emp.excecao_tipo_nota, emp.nome_empresa, emp.empresa_id_erp
            FROM averbacoes_log log
            JOIN empresas emp ON log.id_empresa = emp.id
            WHERE log.id = ANY($1::int[]) AND (log.status = 'PENDENTE_PROCESSAMENTO' OR log.status = 'AGUARDANDO_ENVIO_ATM' OR log.status = 'ERRO_AVERBACAO')
        `, [cleanIds]);
        return res.rows;
    },

    /**
     * Busca uma nota de averbação pelo ID.
     * @param {number} id - O ID da nota no log.
     * @returns {Promise<Object|null>} A nota encontrada ou null.
     */
    findById: async (id) => {
        const res = await pool.query(`
            SELECT log.*, emp.representantes_ignorar, emp.excecao_representante, emp.excecao_tipo_nota, emp.nome_empresa, emp.empresa_id_erp
            FROM averbacoes_log log
            JOIN empresas emp ON log.id_empresa = emp.id
            WHERE log.id = $1
        `, [id]);
        return res.rows[0];
    },

    updateStatus: async (id, status, message) => {
        await pool.query(
            "UPDATE averbacoes_log SET status = $1, mensagem_retorno = $2, data_processamento = CURRENT_TIMESTAMP WHERE id = $3",
            [status, message, id]
        );
    },

    getDashboardData: async () => {
        const result = await pool.query(`
            SELECT 
                emp.nome_empresa,
                log.numero_nota,
                log.tipo_nota,
                log.representante,
                log.status,
                to_char(log.data_emissao, 'DD/MM/YYYY') as data_emissao,
                to_char(log.data_processamento, 'DD/MM/YYYY HH24:MI:SS') as data_processamento,
                log.id,
                log.mensagem_retorno
            FROM averbacoes_log log
            JOIN empresas emp ON log.id_empresa = emp.id
            WHERE log.data_processamento >= current_date
            ORDER BY log.id DESC;
        `);
        return result.rows;
    },

    findByFilters: async (filters) => {
        let query = `
            SELECT 
                emp.nome_empresa,
                log.numero_nota,
                log.tipo_nota,
                log.representante,
                log.status,
                to_char(log.data_emissao, 'DD/MM/YYYY') as data_emissao,
                to_char(log.data_processamento, 'DD/MM/YYYY HH24:MI:SS') as data_processamento,
                log.id,
                log.mensagem_retorno
            FROM averbacoes_log log
            JOIN empresas emp ON log.id_empresa = emp.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.dataInicio) {
            params.push(filters.dataInicio);
            query += ` AND log.data_emissao::date >= $${paramIndex++}`;
        }
        if (filters.dataFim) {
            params.push(filters.dataFim);
            query += ` AND log.data_emissao::date <= $${paramIndex++}`;
        }
        if (filters.status) {
            params.push(filters.status);
            query += ` AND log.status = $${paramIndex++}`;
        }
        if (filters.numero_nota) {
            params.push(`%${filters.numero_nota}%`);
            query += ` AND log.numero_nota ILIKE $${paramIndex++}`;
        }

        query += ' ORDER BY log.id DESC';

        const result = await pool.query(query, params);
        return result.rows;
    }
};

module.exports = averbacaoLogModel;
