from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from . import models, schemas
from .database import engine, get_db
import json
import csv
from fastapi.middleware.cors import CORSMiddleware
from io import StringIO

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoints para Turmas
@app.get("/turmas", response_model=List[schemas.Turma])
def get_turmas(db: Session = Depends(get_db)):
    return db.query(models.Turma).all()

@app.post("/turmas", response_model=schemas.Turma)
def create_turma(turma: schemas.TurmaCreate, db: Session = Depends(get_db)):
    db_turma = models.Turma(**turma.dict())
    db.add(db_turma)
    db.commit()
    db.refresh(db_turma)
    return db_turma

# Endpoints para Alunos
@app.get("/alunos", response_model=List[schemas.Aluno])
def get_alunos(
    search: Optional[str] = None,
    turma_id: Optional[int] = None,
    status: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Aluno)
    
    if search:
        query = query.filter(models.Aluno.nome.ilike(f"%{search}%"))
    if turma_id is not None:
        query = query.filter(models.Aluno.turma_id == turma_id)
    if status is not None:
        query = query.filter(models.Aluno.status == status)
    
    return query.all()

@app.post("/alunos", response_model=schemas.Aluno)
def create_aluno(aluno: schemas.AlunoCreate, db: Session = Depends(get_db)):
    # Validar idade mínima
    hoje = date.today()
    idade = hoje.year - aluno.data_nascimento.year
    if idade < 5:
        raise HTTPException(status_code=400, detail="Aluno deve ter no mínimo 5 anos")
    
    db_aluno = models.Aluno(**aluno.dict())
    db.add(db_aluno)
    db.commit()
    db.refresh(db_aluno)
    return db_aluno

@app.put("/alunos/{aluno_id}", response_model=schemas.Aluno)
def update_aluno(aluno_id: int, aluno: schemas.AlunoCreate, db: Session = Depends(get_db)):
    db_aluno = db.query(models.Aluno).filter(models.Aluno.id == aluno_id).first()
    if not db_aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    for key, value in aluno.dict().items():
        setattr(db_aluno, key, value)
    
    db.commit()
    db.refresh(db_aluno)
    return db_aluno

@app.delete("/alunos/{aluno_id}")
def delete_aluno(aluno_id: int, db: Session = Depends(get_db)):
    db_aluno = db.query(models.Aluno).filter(models.Aluno.id == aluno_id).first()
    if not db_aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    db.delete(db_aluno)
    db.commit()
    return {"message": "Aluno deletado com sucesso"}

# Endpoint para Matrículas
@app.post("/matriculas")
def create_matricula(matricula: schemas.MatriculaCreate, db: Session = Depends(get_db)):
    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(models.Aluno.id == matricula.aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    # Verificar se turma existe
    turma = db.query(models.Turma).filter(models.Turma.id == matricula.turma_id).first()
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    
    # Verificar capacidade da turma
    alunos_na_turma = db.query(models.Aluno).filter(models.Aluno.turma_id == turma.id).count()
    if alunos_na_turma >= turma.capacidade:
        raise HTTPException(status_code=400, detail="Turma está lotada")
    
    # Realizar matrícula
    aluno.turma_id = turma.id
    aluno.status = True
    db.commit()
    db.refresh(aluno)
    
    return {"message": "Matrícula realizada com sucesso"}

# Endpoints para Relatórios
@app.get("/relatorios/alunos")
def export_alunos(format: str = Query(..., regex="^(csv|json)$"), db: Session = Depends(get_db)):
    alunos = db.query(models.Aluno).all()
    
    if format == "json":
        alunos_data = [
            {
                "id": aluno.id,
                "nome": aluno.nome,
                "data_nascimento": aluno.data_nascimento.isoformat(),
                "email": aluno.email,
                "status": aluno.status,
                "turma_id": aluno.turma_id
            }
            for aluno in alunos
        ]
        return alunos_data
    
    elif format == "csv":
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=["id", "nome", "data_nascimento", "email", "status", "turma_id"])
        writer.writeheader()
        for aluno in alunos:
            writer.writerow({
                "id": aluno.id,
                "nome": aluno.nome,
                "data_nascimento": aluno.data_nascimento.isoformat(),
                "email": aluno.email,
                "status": aluno.status,
                "turma_id": aluno.turma_id
            })
        return output.getvalue()
