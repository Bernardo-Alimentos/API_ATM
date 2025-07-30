/*
================================================================================
ARQUIVO: /public/script.js
INSTRUÇÕES: Lógica do front-end para o dashboard e a nova tela de consulta.
================================================================================
*/
document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos Comuns ---
    const statusText = document.getElementById('status-text');
    let dashboardDataTable = null;
    let consultaDataTable = null;

    // --- Elementos do Dashboard ---
    const dashboardView = document.getElementById('dashboard-view');
    const navDashboard = document.getElementById('nav-dashboard');

    // --- Elementos da Consulta ---
    const consultaView = document.getElementById('consulta-view');
    const navConsulta = document.getElementById('nav-consulta');
    const consultaForm = document.getElementById('consulta-form');

    // Mapeia os status internos para textos e classes CSS
    const statusMap = {
        'AVERBADA': { text: 'Averbada', className: 'status-AVERBADA' },
        'AGUARDANDO_ENVIO_ATM': { text: 'Aguardando Envio', className: 'status-AGUARDANDO_ENVIO_ATM' },
        'PENDENTE_PROCESSAMENTO': { text: 'Pendente', className: 'status-PENDENTE_PROCESSAMENTO' },
        'ERRO_AVERBACAO': { text: 'Erro', className: 'status-ERRO_AVERBACAO' },
        'IGNORADA_REGRA': { text: 'Ignorada', className: 'status-IGNORADA_REGRA' }
    };

    // --- Lógica de Navegação ---
    function showView(viewToShow) {
        dashboardView.classList.add('hidden');
        consultaView.classList.add('hidden');
        navDashboard.classList.remove('active');
        navConsulta.classList.remove('active');

        if (viewToShow === 'dashboard') {
            dashboardView.classList.remove('hidden');
            navDashboard.classList.add('active');
        } else if (viewToShow === 'consulta') {
            consultaView.classList.remove('hidden');
            navConsulta.classList.add('active');
        }
    }

    navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        showView('dashboard');
    });

    navConsulta.addEventListener('click', (e) => {
        e.preventDefault();
        showView('consulta');
    });

    // --- Lógica do Dashboard ---
    async function fetchDashboardData() {
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
                { data: 'data_emissao' }, // CORREÇÃO: Adicionada a coluna
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
            order: [[6, 'desc']] // CORREÇÃO: A ordem agora é pela coluna 6 (Processado em)
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
                { data: 'data_emissao' }, // CORREÇÃO: Adicionada a coluna
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
            order: [[6, 'desc']] // CORREÇÃO: A ordem agora é pela coluna 6 (Processado em)
        });
    }

    // --- Inicialização ---
    showView('dashboard');
    fetchDashboardData();
    setInterval(fetchDashboardData, 30000);
});
