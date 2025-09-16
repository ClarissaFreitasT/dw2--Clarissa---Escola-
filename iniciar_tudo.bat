@echo off
REM Script para iniciar backend, frontend e garantir o banco de dados

REM Iniciar backend em uma nova janela (rodando como pacote)
start cmd /k "cd /d %~dp0 && python -m uvicorn backend.main:app --reload"

REM Abrir o frontend (index.html) no navegador padrão
start "" "%~dp0frontend\index.html"

echo Backend e frontend iniciados!
pause
