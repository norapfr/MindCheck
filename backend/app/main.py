from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.database import init_db
from app.routes import account, analyze, auth
from app.limiter import limiter


app = FastAPI(
    title="MindCheck API",
    description=(
        "API de análisis de bienestar emocional. "
        "IMPORTANTE: esta herramienta NO diagnostica ni sustituye ayuda "
        "profesional. Es un apoyo al autoconocimiento."
    ),
    version="0.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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

# cara al futuro si se requiere una pagina web

import os

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)