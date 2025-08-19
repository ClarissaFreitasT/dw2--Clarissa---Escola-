# Sistema de Gestão Escolar

Este é um sistema web de gestão escolar que permite gerenciar alunos, turmas e matrículas.

## Funcionalidades

- CRUD completo de alunos e turmas
- Gestão de matrículas
- Filtros combinados (turma + status + texto)
- Ordenação por nome/idade
- Exportação de dados em CSV/JSON
- Interface responsiva e acessível

## Tecnologias Utilizadas

- Backend: Python com FastAPI
- Frontend: HTML, CSS e JavaScript vanilla
- Banco de dados: SQLite
- Acessibilidade: ARIA labels e boas práticas

## Configuração do Ambiente

1. Instale o Python 3.8 ou superior

2. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/gestao-escolar.git
cd gestao-escolar
```

3. Crie e ative um ambiente virtual:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

4. Instale as dependências:
```bash
pip install -r requirements.txt
```

5. Inicie o servidor:
```bash
uvicorn backend.main:app --reload
```

6. Abra o arquivo frontend/index.html em seu navegador

## Estrutura do Projeto

```
.
├── backend/
│   ├── __init__.py
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   └── database.py
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── script.js
└── requirements.txt
```

## APIs Disponíveis

### Alunos
- GET /alunos - Lista todos os alunos
- POST /alunos - Cria um novo aluno
- PUT /alunos/{id} - Atualiza um aluno
- DELETE /alunos/{id} - Remove um aluno

### Turmas
- GET /turmas - Lista todas as turmas
- POST /turmas - Cria uma nova turma

### Matrículas
- POST /matriculas - Realiza uma nova matrícula

### Relatórios
- GET /relatorios/alunos?format=csv - Exporta alunos em CSV
- GET /relatorios/alunos?format=json - Exporta alunos em JSON

## Contribuindo

1. Faça o fork do projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
