"""
MindCheck backend — FastAPI
Sirve el modelo de análisis de riesgo + auth JWT.

Ejecutar en local:
    uvicorn app.main:app --reload --port 8000

Docs interactivas: http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routes import account, analyze, auth

app = FastAPI(
    title="MindCheck API",
    description=(
        "API de análisis de bienestar emocional. "
        "IMPORTANTE: esta herramienta NO diagnostica ni sustituye ayuda "
        "profesional. Es un apoyo al autoconocimiento."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(analyze.router, tags=["analyze"])
app.include_router(account.router, prefix="/account", tags=["account"])


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}