@echo off
REM Script para iniciar o backend diretamente com o Python do sistema
cd /d %~dp0backend
python -m uvicorn backend.main:app --reload
