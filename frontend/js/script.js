// Configuração da API
const API_URL = 'http://localhost:8000';

// Estado da aplicação
let currentFilters = {
    search: '',
    turma: '',
    status: ''
};

// Cache do localStorage
const SORT_KEY = 'escola_sort_preference';
let sortPreference = JSON.parse(localStorage.getItem(SORT_KEY)) || { field: 'nome', direction: 'asc' };

// Elementos DOM
const searchInput = document.getElementById('searchAluno');
const turmaFilter = document.getElementById('turmaFilter');
const statusFilter = document.getElementById('statusFilter');
const alunoForm = document.getElementById('alunoForm');
const modalAluno = document.getElementById('modalAluno');
const matriculaForm = document.getElementById('matriculaForm');
const modalMatricula = document.getElementById('modalMatricula');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadTurmas();
    loadAlunos();
    updateStats();
});

searchInput.addEventListener('input', debounce(() => {
    currentFilters.search = searchInput.value;
    loadAlunos();
}, 300));

turmaFilter.addEventListener('change', () => {
    currentFilters.turma = turmaFilter.value;
    loadAlunos();
});

statusFilter.addEventListener('change', () => {
    currentFilters.status = statusFilter.value;
    loadAlunos();
});

document.getElementById('novoAluno').addEventListener('click', () => {
    openModal();
});

document.getElementById('exportarDados').addEventListener('click', () => {
    exportData();
});

alunoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveAluno();
});

matriculaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveMatricula();
});

// Funções de API
async function loadTurmas() {
    try {
        const response = await fetch(`${API_URL}/turmas`);
        const turmas = await response.json();
        
        // Preencher selects de turma
        const turmaSelects = [turmaFilter, document.getElementById('turma'), document.getElementById('turmaMatricula')];
        turmaSelects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Selecione uma turma</option>';
                turmas.forEach(turma => {
                    select.innerHTML += `<option value="${turma.id}">${turma.nome}</option>`;
                });
            }
        });
    } catch (error) {
        showError('Erro ao carregar turmas');
    }
}

async function loadAlunos() {
    try {
        let url = `${API_URL}/alunos?`;
        if (currentFilters.search) url += `search=${encodeURIComponent(currentFilters.search)}&`;
        if (currentFilters.turma) url += `turma_id=${currentFilters.turma}&`;
        if (currentFilters.status) url += `status=${currentFilters.status}`;

        const response = await fetch(url);
        const alunos = await response.json();
        
        // Aplicar ordenação
        alunos.sort((a, b) => {
            const aValue = a[sortPreference.field];
            const bValue = b[sortPreference.field];
            const direction = sortPreference.direction === 'asc' ? 1 : -1;
            return aValue > bValue ? direction : -direction;
        });

        displayAlunos(alunos);
        updateStats(alunos);
    } catch (error) {
        showError('Erro ao carregar alunos');
    }
}

async function saveAluno() {
    try {
        const formData = new FormData(alunoForm);
        const data = {
            nome: formData.get('nome'),
            data_nascimento: formData.get('dataNascimento'),
            email: formData.get('email') || null,
            turma_id: formData.get('turma') || null,
            status: true
        };

        const response = await fetch(`${API_URL}/alunos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail);
        }

        closeModal();
        loadAlunos();
        showSuccess('Aluno cadastrado com sucesso!');
    } catch (error) {
        showError(error.message);
    }
}

async function saveMatricula() {
    try {
        const formData = new FormData(matriculaForm);
        const data = {
            aluno_id: parseInt(formData.get('alunoMatricula')),
            turma_id: parseInt(formData.get('turmaMatricula'))
        };

        const response = await fetch(`${API_URL}/matriculas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail);
        }

        closeMatriculaModal();
        loadAlunos();
        showSuccess('Matrícula realizada com sucesso!');
    } catch (error) {
        showError(error.message);
    }
}

async function deleteAluno(id) {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;

    try {
        const response = await fetch(`${API_URL}/alunos/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Erro ao excluir aluno');
        }

        loadAlunos();
        showSuccess('Aluno excluído com sucesso!');
    } catch (error) {
        showError(error.message);
    }
}

async function exportData() {
    try {
        const format = prompt('Escolha o formato de exportação (csv/json):', 'csv');
        if (!format || !['csv', 'json'].includes(format.toLowerCase())) return;

        const response = await fetch(`${API_URL}/relatorios/alunos?format=${format}`);
        const data = await response.text();

        const blob = new Blob([data], { type: `text/${format}` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alunos.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        showError('Erro ao exportar dados');
    }
}

// Funções de UI
function displayAlunos(alunos) {
    const tbody = document.querySelector('#alunosTable tbody');
    tbody.innerHTML = '';

    alunos.forEach(aluno => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${aluno.nome}</td>
            <td>${new Date(aluno.data_nascimento).toLocaleDateString()}</td>
            <td>${aluno.email || '-'}</td>
            <td>${aluno.status ? 'Ativo' : 'Inativo'}</td>
            <td>${aluno.turma_id || '-'}</td>
            <td>
                <button onclick="editAluno(${aluno.id})" class="btn secondary" aria-label="Editar ${aluno.nome}">✏️</button>
                <button onclick="deleteAluno(${aluno.id})" class="btn secondary" aria-label="Excluir ${aluno.nome}">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStats(alunos = []) {
    const totalElement = document.getElementById('totalAlunos');
    const ativosElement = document.getElementById('alunosAtivos');
    const inativosElement = document.getElementById('alunosInativos');

    const total = alunos.length;
    const ativos = alunos.filter(a => a.status).length;
    const inativos = total - ativos;

    totalElement.textContent = total;
    ativosElement.textContent = ativos;
    inativosElement.textContent = inativos;

    // Atualizar ARIA para acessibilidade
    totalElement.setAttribute('aria-label', `Total de alunos: ${total}`);
    ativosElement.setAttribute('aria-label', `Alunos ativos: ${ativos}`);
    inativosElement.setAttribute('aria-label', `Alunos inativos: ${inativos}`);
}

function openModal() {
    modalAluno.style.display = 'block';
    document.getElementById('nome').focus();
}

function closeModal() {
    modalAluno.style.display = 'none';
    alunoForm.reset();
}

function openMatriculaModal() {
    modalMatricula.style.display = 'block';
    document.getElementById('alunoMatricula').focus();
}

function closeMatriculaModal() {
    modalMatricula.style.display = 'none';
    matriculaForm.reset();
}

function showSuccess(message) {
    alert(message); // Você pode implementar uma versão mais sofisticada
}

function showError(message) {
    alert(`Erro: ${message}`); // Você pode implementar uma versão mais sofisticada
}

// Utilitários
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
