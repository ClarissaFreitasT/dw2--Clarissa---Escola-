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

// Gerenciar turmas
document.getElementById('gerenciarTurmas').addEventListener('click', () => {
    openTurmaModal();
});

const turmaForm = document.getElementById('turmaForm');
const modalTurmas = document.getElementById('modalTurmas');
let editingTurmaId = null;

function openTurmaModal() {
    modalTurmas.style.display = 'block';
    document.getElementById('turmaNome').focus();
    loadTurmasList();
}

function closeTurmaModal() {
    modalTurmas.style.display = 'none';
    turmaForm.reset();
    editingTurmaId = null;
}

turmaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveTurma();
});

async function loadTurmasList() {
    try {
        const [turmasResponse, alunosResponse] = await Promise.all([
            fetch(`${API_URL}/turmas`),
            fetch(`${API_URL}/alunos`)
        ]);
        const turmas = await turmasResponse.json();
        const alunos = await alunosResponse.json();
        const container = document.getElementById('turmasList');
        container.innerHTML = '';
        turmas.forEach(t => {
            const ocupados = alunos.filter(a => a.turma_id === t.id).length;
            const div = document.createElement('div');
            div.className = 'turma-item';
            div.innerHTML = `<strong>${t.nome}</strong> (${ocupados}/${t.capacidade} alunos) <button onclick="editTurma(${t.id}, '${escapeHtml(t.nome)}', ${t.capacidade})">Editar</button>`;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('loadTurmasList failed:', error);
        showError('Erro ao carregar lista de turmas');
    }
}

function escapeHtml(unsafe) {
    return unsafe.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

async function saveTurma() {
    try {
        const nome = document.getElementById('turmaNome').value.trim();
        const capacidade = parseInt(document.getElementById('turmaCapacidade').value, 10);

        if (!nome || isNaN(capacidade) || capacidade < 1) {
            showError('Nome e capacidade válidos são necessários');
            return;
        }

        const payload = { nome, capacidade };

        let response;
        if (editingTurmaId) {
            response = await fetch(`${API_URL}/turmas/${editingTurmaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch(`${API_URL}/turmas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Erro ao salvar turma');
        }

        turmaForm.reset();
        editingTurmaId = null;
        loadTurmas(); // atualizar selects
        loadTurmasList();
        showSuccess('Turma salva com sucesso');
    } catch (error) {
        console.error('saveTurma failed:', error);
        showError(error.message || 'Erro ao salvar turma');
    }
}

function editTurma(id, nome, capacidade) {
    editingTurmaId = id;
    document.getElementById('turmaNome').value = nome.replace(/&quot;/g, '"');
    document.getElementById('turmaCapacidade').value = capacidade;
    document.getElementById('turmaNome').focus();
}

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
        const [turmasResponse, alunosResponse] = await Promise.all([
            fetch(`${API_URL}/turmas`),
            fetch(`${API_URL}/alunos`)
        ]);
        const turmas = await turmasResponse.json();
        const alunos = await alunosResponse.json();
        // Preencher o select de filtro (permite ver turmas mesmo quando estiverem cheias)
        if (turmaFilter) {
            turmaFilter.innerHTML = '<option value="">Selecione uma turma</option>';
            turmas.forEach(turma => {
                const ocupados = alunos.filter(a => a.turma_id === turma.id).length;
                turmaFilter.innerHTML += `<option value="${turma.id}">${turma.nome} (${ocupados}/${turma.capacidade})</option>`;
            });
        }

        // Preencher selects de formulário (mantém turmas lotadas como disabled para seleção)
        const formSelects = [document.getElementById('turma'), document.getElementById('turmaMatricula')];
        formSelects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Selecione uma turma</option>';
                turmas.forEach(turma => {
                    const ocupados = alunos.filter(a => a.turma_id === turma.id).length;
                    const disabled = ocupados >= turma.capacidade ? 'disabled' : '';
                    select.innerHTML += `<option value="${turma.id}" ${disabled}>${turma.nome} (${ocupados}/${turma.capacidade})</option>`;
                });
            }
        });
    } catch (error) {
        console.error('loadTurmas failed:', error);
        showError('Erro ao carregar turmas');
    }
}

async function loadAlunos() {
    try {
        let url = `${API_URL}/alunos?`;
        if (currentFilters.search) url += `search=${encodeURIComponent(currentFilters.search)}&`;
        if (currentFilters.turma) url += `turma_id=${currentFilters.turma}&`;
        if (currentFilters.status) url += `status=${currentFilters.status}`;

        const [alunosResponse, turmasResponse] = await Promise.all([
            fetch(url),
            fetch(`${API_URL}/turmas`)
        ]);
        const alunos = await alunosResponse.json();
        const turmas = await turmasResponse.json();
        const turmaMap = {};
        turmas.forEach(t => turmaMap[t.id] = t.nome);

        // Aplicar ordenação
        alunos.sort((a, b) => {
            const aValue = a[sortPreference.field];
            const bValue = b[sortPreference.field];
            const direction = sortPreference.direction === 'asc' ? 1 : -1;
            return aValue > bValue ? direction : -direction;
        });

        displayAlunos(alunos, turmaMap);
        updateStats(alunos);
    } catch (error) {
        console.error('loadAlunos failed:', error);
        showError('Erro ao carregar alunos');
    }
}

let editingAlunoId = null;

async function saveAluno() {
    try {
        const formData = new FormData(alunoForm);
        const data = {
            nome: formData.get('nome'),
            data_nascimento: formData.get('dataNascimento'),
            email: formData.get('email') || null,
            turma_id: formData.get('turma') || null,
            status: formData.get('statusAluno') === 'true'
        };

        let response;
        if (editingAlunoId) {
            response = await fetch(`${API_URL}/alunos/${editingAlunoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`${API_URL}/alunos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail);
        }

        closeModal();
        loadAlunos();
        showSuccess(editingAlunoId ? 'Aluno atualizado com sucesso!' : 'Aluno cadastrado com sucesso!');
        editingAlunoId = null;
    } catch (error) {
        console.error('saveAluno failed:', error);
        showError(error.message || 'Erro ao salvar aluno');
    }
}

// Função para editar aluno
window.editAluno = async function(id) {
    try {
        const response = await fetch(`${API_URL}/alunos`);
        const alunos = await response.json();
        const aluno = alunos.find(a => a.id === id);
        if (!aluno) {
            showError('Aluno não encontrado');
            return;
        }
        editingAlunoId = id;
        modalAluno.style.display = 'block';
        document.getElementById('nome').value = aluno.nome;
        document.getElementById('dataNascimento').value = aluno.data_nascimento;
        document.getElementById('email').value = aluno.email || '';
        document.getElementById('turma').value = aluno.turma_id || '';
        document.getElementById('statusAluno').value = aluno.status ? 'true' : 'false';
        document.getElementById('nome').focus();
    } catch (error) {
        showError('Erro ao carregar dados do aluno para edição');
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
        console.error('saveMatricula failed:', error);
        showError(error.message || 'Erro ao realizar matrícula');
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
        console.error('deleteAluno failed:', error);
        showError(error.message || 'Erro ao excluir aluno');
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
        console.error('exportData failed:', error);
        showError('Erro ao exportar dados');
    }
}

// Funções de UI
function displayAlunos(alunos, turmaMap = {}) {
    const tbody = document.querySelector('#alunosTable tbody');
    tbody.innerHTML = '';

    alunos.forEach(aluno => {
        const tr = document.createElement('tr');
        const turmaNome = aluno.turma_id ? (turmaMap[aluno.turma_id] || '-') : '-';
        tr.innerHTML = `
            <td>${aluno.nome}</td>
            <td>${new Date(aluno.data_nascimento).toLocaleDateString()}</td>
            <td>${aluno.email || '-'}</td>
            <td>${aluno.status ? 'Ativo' : 'Inativo'}</td>
            <td>${turmaNome}</td>
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
    editingAlunoId = null;
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
