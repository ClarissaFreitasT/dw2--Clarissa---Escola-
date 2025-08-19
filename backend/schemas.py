from pydantic import BaseModel, EmailStr, Field
from datetime import date
from typing import Optional

class TurmaBase(BaseModel):
    nome: str
    capacidade: int

class TurmaCreate(TurmaBase):
    pass

class Turma(TurmaBase):
    id: int
    
    class Config:
        orm_mode = True

class AlunoBase(BaseModel):
    nome: str = Field(..., min_length=3, max_length=80)
    data_nascimento: date
    email: Optional[EmailStr] = None
    status: bool = True
    turma_id: Optional[int] = None

class AlunoCreate(AlunoBase):
    pass

class Aluno(AlunoBase):
    id: int
    
    class Config:
        orm_mode = True

class MatriculaCreate(BaseModel):
    aluno_id: int
    turma_id: int
