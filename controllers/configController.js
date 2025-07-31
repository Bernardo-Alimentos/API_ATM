/*
================================================================================
ARQUIVO: /controllers/configController.js
INSTRUÇÕES: Lógica para a futura tela de configurações (CRUD de empresas).
================================================================================
*/
const empresaModel = require('../models/empresaModel'); // Importe o modelo

const configController = {
    /**
     * GET /api/config/empresas
     * Lista todas as empresas.
     */
    async getEmpresas(req, res) {
        try {
            const empresas = await empresaModel.findAll();
            res.json(empresas);
        } catch (error) {
            console.error("Erro ao buscar empresas no configController:", error);
            res.status(500).json({ error: 'Erro interno do servidor ao buscar empresas.' });
        }
    },

    /**
     * GET /api/config/empresas/:id
     * Busca uma empresa específica pelo ID.
     */
    async getEmpresaById(req, res) {
        try {
            const { id } = req.params;
            const empresa = await empresaModel.findById(parseInt(id));
            if (!empresa) {
                return res.status(404).json({ error: 'Empresa não encontrada.' });
            }
            res.json(empresa);
        } catch (error) {
            console.error("Erro ao buscar empresa por ID no configController:", error);
            res.status(500).json({ error: 'Erro interno do servidor ao buscar empresa.' });
        }
    },

    /**
     * POST /api/config/empresas
     * Cria uma nova empresa.
     */
    async createEmpresa(req, res) {
        try {
            const newEmpresaData = req.body;

            // Validação básica dos dados recebidos
            if (!newEmpresaData.nome_empresa || !newEmpresaData.cnpj || !newEmpresaData.empresa_id_erp) {
                return res.status(400).json({ error: 'Campos obrigatórios faltando (nome_empresa, cnpj, empresa_id_erp).' });
            }

            // O campo 'ativo' pode vir como booleano ou string. Converta para booleano.
            newEmpresaData.ativo = newEmpresaData.ativo === true || newEmpresaData.ativo === 'true' || newEmpresaData.ativo === '1';

            const createdEmpresa = await empresaModel.create(newEmpresaData);
            res.status(201).json(createdEmpresa);
        } catch (error) {
            console.error("Erro ao criar empresa no configController:", error);
            // Erro de duplicidade de CNPJ, por exemplo
            if (error.code === '23505') { // Código de erro do PostgreSQL para violação de unique_constraint
                return res.status(409).json({ error: 'CNPJ já cadastrado.' });
            }
            res.status(500).json({ error: 'Erro interno do servidor ao criar empresa.' });
        }
    },

    /**
     * PUT /api/config/empresas/:id
     * Atualiza uma empresa existente.
     */
    async updateEmpresa(req, res) {
        try {
            const { id } = req.params;
            const dataToUpdate = req.body;

            // Validação básica
            if (!id || Object.keys(dataToUpdate).length === 0) {
                return res.status(400).json({ error: 'Dados inválidos para atualização.' });
            }

            // O campo 'ativo' pode vir como booleano ou string. Converta para booleano.
            if (dataToUpdate.hasOwnProperty('ativo')) {
                dataToUpdate.ativo = dataToUpdate.ativo === true || dataToUpdate.ativo === 'true' || dataToUpdate.ativo === '1';
            }

            const updatedEmpresa = await empresaModel.update(parseInt(id), dataToUpdate);
            if (!updatedEmpresa) {
                return res.status(404).json({ error: 'Empresa não encontrada.' });
            }
            res.json(updatedEmpresa);
        } catch (error) {
            console.error("Erro ao atualizar empresa no configController:", error);
            // Erro de duplicidade de CNPJ, por exemplo
            if (error.code === '23505') {
                return res.status(409).json({ error: 'CNPJ já cadastrado para outra empresa.' });
            }
            res.status(500).json({ error: 'Erro interno do servidor ao atualizar empresa.' });
        }
    },

    /**
     * DELETE /api/config/empresas/:id
     * Deleta uma empresa.
     */
    async deleteEmpresa(req, res) {
        try {
            const { id } = req.params;
            const deleted = await empresaModel.delete(parseInt(id));
            if (!deleted) {
                return res.status(404).json({ error: 'Empresa não encontrada para exclusão.' });
            }
            res.status(204).send();
        } catch (error) {
            console.error("Erro ao deletar empresa no configController:", error);
            res.status(500).json({ error: 'Erro interno do servidor ao deletar empresa.' });
        }
    }
};

module.exports = configController;