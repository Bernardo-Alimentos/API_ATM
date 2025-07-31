/*
================================================================================
ARQUIVO: /public/script.js
INSTRUÇÕES: Lógica do front-end para o dashboard, consulta e configurações de empresas.
================================================================================
*/
document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos Comuns ---
    const statusText = document.getElementById('status-text');
    let dashboardDataTable = null;
    let consultaDataTable = null;
    let empresasDataTable = null;

    // --- Elementos das Views ---
    const dashboardView = document.getElementById('dashboard-view');
    const consultaView = document.getElementById('consulta-view');
    const configView = document.getElementById('config-view');

    // --- Elementos de Navegação ---
    const navDashboard = document.getElementById('nav-dashboard');
    const navConsulta = document.getElementById('nav-consulta');
    const navConfig = document.getElementById('nav-config');

    // --- Elementos da Consulta ---
    const consultaForm = document.getElementById('consulta-form');
    const selectAllNotesCheckbox = document.getElementById('select-all-notes'); // NOVO: Checkbox "Selecionar Todos"
    const reenviarSelecionadasBtn = document.getElementById('reenviar-selecionadas-btn'); // NOVO: Botão "Reenviar Selecionadas"

    // --- Elementos das Configurações de Empresas ---
    const addEmpresaBtn = document.getElementById('add-empresa-btn');
    const empresaModal = document.getElementById('empresa-modal');
    const closeEmpresaModalBtn = document.getElementById('close-empresa-modal');
    const empresaForm = document.getElementById('empresa-form');
    const empresaIdInput = document.getElementById('empresa-id');
    const formTitle = document.getElementById('form-title');
    const saveEmpresaBtn = document.getElementById('save-empresa-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // Mapeia IDs dos inputs do formulário para os nomes dos campos no objeto da empresa
    const formFieldMap = {
        'nome_empresa': 'nome_empresa',
        'cnpj': 'cnpj',
        'empresa_id_erp': 'empresa_id_erp',
        'tipos_nota_considerar': 'tipos_nota_considerar',
        'representantes_ignorar': 'representantes_ignorar',
        'excecao_representante': 'excecao_representante',
        'excecao_tipo_nota': 'excecao_tipo_nota',
        'ativo': 'ativo'
    };

    // Mapeia os status internos para textos e classes CSS
    const statusMap = {
        'AVERBADA': { text: 'Averbada', className: 'status-AVERBADA' },
        'AGUARDANDO_ENVIO_ATM': { text: 'Aguardando Envio', className: 'status-AGUARDANDO_ENVIO_ATM' },
        'PENDENTE_PROCESSAMENTO': { text: 'Pendente', className: 'status-PENDENTE_PROCESSAMENTO' },
        'ERRO_AVERBACAO': { text: 'Erro', className: 'status-ERRO_AVERBACAO' },
        'IGNORADA_REGRA': { text: 'Ignorada', className: 'status-IGNORADA_REGRA' }
    };

    // --- Lógica de Navegação e Visibilidade das Seções ---
    function showView(viewToShowId) {
        document.querySelectorAll('.sidebar-nav li a').forEach(link => link.classList.remove('active'));
        document.querySelectorAll('main section').forEach(section => {
            section.classList.remove('active-section');
            section.classList.add('hidden-section');
        });

        // Destroi DataTables se existirem (antes de ocultar ou antes de criar nova instância)
        if (dashboardDataTable) { dashboardDataTable.destroy(); dashboardDataTable = null; }
        if (consultaDataTable) { consultaDataTable.destroy(); consultaDataTable = null; }
        if (empresasDataTable) { empresasDataTable.destroy(); empresasDataTable = null; }

        closeEmpresaModal(); // Fechar o modal sempre que trocar de view principal.

        if (viewToShowId === 'dashboard-view') {
            navDashboard.classList.add('active');
            dashboardView.classList.remove('hidden-section');
            dashboardView.classList.add('active-section');
            fetchDashboardData();
        } else if (viewToShowId === 'consulta-view') {
            navConsulta.classList.add('active');
            consultaView.classList.remove('hidden-section');
            consultaView.classList.add('active-section');
            // Resetar filtros e buscar dados ao entrar na consulta
            consultaForm.reset();
            fetchConsultaData(''); // Carrega a consulta vazia ao entrar na tela
        } else if (viewToShowId === 'config-view') {
            navConfig.classList.add('active');
            configView.classList.remove('hidden-section');
            configView.classList.add('active-section');
            fetchAndRenderEmpresas();
            resetEmpresaForm();
        }
    }

    navDashboard.addEventListener('click', (e) => { e.preventDefault(); showView('dashboard-view'); });
    navConsulta.addEventListener('click', (e) => { e.preventDefault(); showView('consulta-view'); });
    navConfig.addEventListener('click', (e) => { e.preventDefault(); showView('config-view'); });


    // --- Lógica do Dashboard ---
    async function fetchDashboardData() {
        statusText.previousElementSibling.classList.add('fa-spin');
        statusText.textContent = 'Carregando dados...';
        try {
            const response = await fetch('/api/dashboard');
            if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
            const data = await response.json();
            renderDashboardTable(data);
            statusText.textContent = `Dados atualizados em ${new Date().toLocaleTimeString('pt-BR')}`;
            statusText.previousElementSibling.classList.remove('fa-spin');
        } catch (error) {
            console.error('Falha ao buscar dados do dashboard:', error);
            statusText.textContent = 'Erro ao carregar dados.';
            statusText.previousElementSibling.classList.remove('fa-spin');
        }
    }

    function renderDashboardTable(data) {
        if (dashboardDataTable) {
            dashboardDataTable.destroy();
        }

        dashboardDataTable = new DataTable('#dashboard-table', {
            data: data,
            columns: [
                { data: 'nome_empresa' },
                { data: 'numero_nota' },
                { data: 'tipo_nota' },
                { data: 'representante' },
                {
                    data: 'status',
                    render: function (data) {
                        const statusInfo = statusMap[data] || { text: data, className: '' };
                        return `<span class="status ${statusInfo.className}">${statusInfo.text}</span>`;
                    }
                },
                { data: 'data_emissao' },
                { data: 'data_processamento' },
                {
                    data: 'mensagem_retorno',
                    render: function (data) {
                        return `<button class="action-btn" title="${data}"><i class="fas fa-info-circle"></i></button>`;
                    },
                    orderable: false
                }
            ],
            language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json' },
            order: [[6, 'desc']]
        });
    }

    // --- Lógica da Consulta ---
    consultaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(consultaForm);
        const params = new URLSearchParams(formData);

        for (let [key, value] of params.entries()) {
            if (!value) {
                params.delete(key);
            }
        }
        await fetchConsultaData(params.toString());
    });

    async function fetchConsultaData(queryString) {
        const resultsInfo = document.getElementById('consulta-results-info');
        resultsInfo.textContent = 'Buscando...';
        try {
            const response = await fetch(`/api/consulta?${queryString}`);
            if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
            const data = await response.json();
            renderConsultaTable(data);
            resultsInfo.textContent = `${data.length} registro(s) encontrado(s).`;
        } catch (error) {
            console.error('Falha ao buscar dados da consulta:', error);
            resultsInfo.textContent = 'Erro ao realizar a busca.';
        }
    }

    function renderConsultaTable(data) {
        if (consultaDataTable) {
            consultaDataTable.destroy();
        }

        consultaDataTable = new DataTable('#consulta-table', {
            data: data,
            columns: [
                { // NOVO: Coluna para o checkbox individual
                    data: 'id',
                    render: function (data, type, row) {
                        // Apenas permite selecionar notas com status de reenvio válido
                        const canResend = ['PENDENTE_PROCESSAMENTO', 'AGUARDANDO_ENVIO_ATM', 'ERRO_AVERBACAO'].includes(row.status);
                        return canResend ? `<input type="checkbox" class="note-select-checkbox" value="${data}">` : '';
                    },
                    orderable: false,
                    className: 'dt-body-center' // Centraliza o checkbox
                },
                { data: 'nome_empresa' },
                { data: 'numero_nota' },
                { data: 'tipo_nota' },
                { data: 'representante' },
                {
                    data: 'status',
                    render: function (data) {
                        const statusInfo = statusMap[data] || { text: data, className: '' };
                        return `<span class="status ${statusInfo.className}">${statusInfo.text}</span>`;
                    }
                },
                { data: 'data_emissao' },
                { data: 'data_processamento' },
                {
                    data: 'mensagem_retorno',
                    render: function (data) {
                        return `<button class="action-btn" title="${data}"><i class="fas fa-info-circle"></i></button>`;
                    },
                    orderable: false
                }
            ],
            language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json' },
            order: [[7, 'desc']] // Ajuste o índice da coluna para ordenação (agora 7 para "Processado em")
        });

        // NOVO: Event listeners para os checkboxes da tabela de consulta
        $('#consulta-table').off('change', '.note-select-checkbox').on('change', '.note-select-checkbox', function () {
            // Se um checkbox individual mudar, desmarca "Selecionar Todos" se nem todos estiverem marcados
            if (!this.checked) {
                selectAllNotesCheckbox.checked = false;
            } else {
                // Verifica se todos os checkboxes visíveis estão marcados
                const allChecked = $('.note-select-checkbox:visible:not(:checked)').length === 0;
                selectAllNotesCheckbox.checked = allChecked;
            }
        });
    }

    // NOVO: Lógica para o checkbox "Selecionar Todos"
    selectAllNotesCheckbox.addEventListener('change', function () {
        // Marca/desmarca todos os checkboxes individuais visíveis
        $('.note-select-checkbox:visible').prop('checked', this.checked);
    });

    // NOVO: Lógica para o botão "Reenviar Selecionadas"
    reenviarSelecionadasBtn.addEventListener('click', async () => {
        const selectedNoteIds = [];
        // Coleta os IDs das notas selecionadas
        $('.note-select-checkbox:checked').each(function () {
            selectedNoteIds.push(parseInt($(this).val()));
        });

        if (selectedNoteIds.length === 0) {
            alert('Selecione pelo menos uma nota para reenviar.');
            return;
        }

        if (!confirm(`Tem certeza que deseja reenviar ${selectedNoteIds.length} nota(s) selecionada(s)?`)) {
            return;
        }

        try {
            const response = await fetch('/api/consulta/reenviar-notas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noteIds: selectedNoteIds })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido ao reenviar notas.' }));
                throw new Error(errorData.error || `Erro HTTP! Status: ${response.status}`);
            }

            const result = await response.json();
            alert(result.message || 'Notas selecionadas enviadas para reprocessamento.');
            // Após o reenvio, recarrega a tabela de consulta para ver os status atualizados
            const formData = new FormData(consultaForm);
            const params = new URLSearchParams(formData);
            await fetchConsultaData(params.toString()); // Re-executa a busca com os filtros atuais
            selectAllNotesCheckbox.checked = false; // Desmarca o "Selecionar Todos"
        } catch (error) {
            console.error('Erro ao reenviar notas:', error);
            alert(`Erro ao reenviar notas: ${error.message}`);
        }
    });


    // --- Lógica das Configurações de Empresas ---

    // Funções para abrir/fechar o modal
    function openEmpresaModal() {
        empresaModal.classList.remove('hidden');
    }

    function closeEmpresaModal() {
        empresaModal.classList.add('hidden');
        resetEmpresaForm();
    }

    // Event listeners para o modal
    closeEmpresaModalBtn.addEventListener('click', closeEmpresaModal);
    window.addEventListener('click', (event) => {
        if (event.target == empresaModal) {
            closeEmpresaModal();
        }
    });

    async function fetchAndRenderEmpresas() {
        try {
            const response = await fetch('/api/config/empresas');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido na API de empresas.' }));
                throw new Error(errorData.error || `Erro HTTP! Status: ${response.status}`);
            }
            const empresas = await response.json();
            renderEmpresasTable(empresas);
        } catch (error) {
            console.error('Erro ao buscar empresas:', error);
            alert('Erro ao carregar lista de empresas: ' + error.message);
        }
    }

    function renderEmpresasTable(empresas) {
        if (empresasDataTable) {
            empresasDataTable.destroy();
        }

        empresasDataTable = new DataTable('#empresas-table', {
            data: empresas,
            columns: [
                { data: 'id' },
                { data: 'nome_empresa' },
                { data: 'cnpj' },
                { data: 'empresa_id_erp' },
                { data: 'tipos_nota_considerar', defaultContent: '' },
                { data: 'representantes_ignorar', defaultContent: '' },
                { data: 'excecao_representante', defaultContent: '' },
                { data: 'excecao_tipo_nota', defaultContent: '' },
                {
                    data: 'ativo',
                    render: function (data) {
                        return data ? 'Sim' : 'Não';
                    }
                },
                {
                    data: null,
                    render: function (data, type, row) {
                        return `
                            <button class="edit-btn btn-primary" data-id="${row.id}"><i class="fas fa-edit"></i> Editar</button>
                            <button class="delete-btn btn-danger" data-id="${row.id}"><i class="fas fa-trash-alt"></i> Excluir</button>
                        `;
                    },
                    orderable: false
                }
            ],
            language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json' }
        });

        $('#empresas-table').off('click', '.edit-btn').on('click', '.edit-btn', function () {
            const id = $(this).data('id');
            const empresa = empresas.find(e => e.id === id);
            if (empresa) {
                populateEmpresaFormForEdit(empresa);
                openEmpresaModal();
            }
        });

        $('#empresas-table').off('click', '.delete-btn').on('click', '.delete-btn', function () {
            const id = $(this).data('id');
            deleteEmpresa(id);
        });
    }

    function populateEmpresaFormForEdit(empresa) {
        empresaIdInput.value = empresa.id;
        document.getElementById('nome_empresa').value = empresa.nome_empresa;
        document.getElementById('cnpj').value = empresa.cnpj;
        document.getElementById('empresa_id_erp').value = empresa.empresa_id_erp;
        document.getElementById('tipos_nota_considerar').value = empresa.tipos_nota_considerar || '';
        document.getElementById('representantes_ignorar').value = empresa.representantes_ignorar || '';
        document.getElementById('excecao_representante').value = empresa.excecao_representante || '';
        document.getElementById('excecao_tipo_nota').value = empresa.excecao_tipo_nota || '';
        document.getElementById('ativo').checked = empresa.ativo;

        formTitle.textContent = `Editar Empresa: ${empresa.nome_empresa}`;
        saveEmpresaBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar Empresa';
        cancelEditBtn.classList.remove('hidden');
    }

    function resetEmpresaForm() {
        empresaForm.reset();
        empresaIdInput.value = '';
        formTitle.textContent = 'Adicionar Nova Empresa';
        saveEmpresaBtn.innerHTML = '<i class="fas fa-plus"></i> Salvar Empresa';
        cancelEditBtn.classList.add('hidden');
    }

    addEmpresaBtn.addEventListener('click', () => {
        resetEmpresaForm();
        openEmpresaModal();
    });

    cancelEditBtn.addEventListener('click', closeEmpresaModal);

    empresaForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const id = empresaIdInput.value;
        const empresaData = {};
        for (const key in formFieldMap) {
            const element = document.getElementById(key);
            if (element) {
                empresaData[formFieldMap[key]] = element.type === 'checkbox' ? element.checked : element.value;
                if (key === 'empresa_id_erp') {
                    empresaData[formFieldMap[key]] = parseInt(element.value) || (element.value === '' ? null : undefined);
                }
                if (element.tagName === 'INPUT' && element.type === 'text' && element.value === '') {
                    empresaData[formFieldMap[key]] = null;
                }
            }
        }

        try {
            let response;
            if (id) {
                response = await fetch(`/api/config/empresas/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(empresaData)
                });
            } else {
                response = await fetch('/api/config/empresas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(empresaData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido ao salvar empresa. Verifique o console.' }));
                throw new Error(errorData.error || `Erro HTTP! Status: ${response.status}`);
            }

            const result = await response.json();
            alert(`Empresa ${id ? 'atualizada' : 'criada'} com sucesso!`);
            closeEmpresaModal();
            fetchAndRenderEmpresas();
        } catch (error) {
            console.error('Erro ao salvar empresa:', error);
            alert(`Erro ao salvar empresa: ${error.message}`);
        }
    });

    async function deleteEmpresa(id) {
        if (!confirm('Tem certeza que deseja excluir esta empresa? Esta ação é irreversível.')) {
            return;
        }
        try {
            const response = await fetch(`/api/config/empresas/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido ao excluir empresa.' }));
                throw new Error(errorData.error || `Erro HTTP! Status: ${response.status}`);
            }

            if (response.status === 204) {
                alert('Empresa excluída com sucesso!');
            } else {
                alert('Empresa excluída com sucesso! (Resposta do servidor não 204, pode indicar problema)');
            }

            fetchAndRenderEmpresas();
            resetEmpresaForm();
        } catch (error) {
            console.error('Erro ao excluir empresa:', error);
            alert(`Erro ao excluir empresa: ${error.message}`);
        }
    }

    // --- Inicialização da Aplicação ---
    showView('dashboard-view');
    setInterval(fetchDashboardData, 30000);
});
