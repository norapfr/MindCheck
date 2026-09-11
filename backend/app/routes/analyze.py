from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.crypto import encrypt_text, decrypt_text

from app.config import RISK_THRESHOLD_HIGH
from app.database import get_db, JournalEntry, User
from app.deps import get_current_user
from app.model.exceptions import TextTooShortError
from app.model.language import is_english
from app.model.loader import predict_risk

router = APIRouter()


class AnalyzeRequest(BaseModel):
    text: str


class AnalyzeResponse(BaseModel):
    depression_score: float
    suicide_risk_score: float
    risk_score: float
    category: str
    high_risk: bool  # true si risk_score supera RISK_THRESHOLD_HIGH -> frontend debe mostrar recursos ya


class EntryResponse(BaseModel):
    id: int
    text: str
    depression_score: float
    suicide_risk_score: float
    risk_score: float
    category: str
    created_at: datetime  # necesario para calcular la racha de días en el frontend

    class Config:
        from_attributes = True


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(
    payload: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_english(payload.text):
        # 422, no 400: el request esta bien formado, es el contenido lo
        # que no se puede procesar. El frontend distingue esto de un
        # fallo generico y muestra un aviso especifico ("write in English").
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="not_english",
        )

    try:
        result = predict_risk(payload.text)
    except TextTooShortError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "too_short",
                "word_count": e.word_count,
                "min_words": e.min_words,
            },
        )

    entry = JournalEntry(
        owner_id=current_user.id,
        text=encrypt_text(payload.text),
        depression_score=result["depression_score"],
        suicide_risk_score=result["suicide_risk_score"],
        risk_score=result["risk_score"],
        category=result["category"],
    )
    db.add(entry)
    db.commit()

    return AnalyzeResponse(
        **result,
        high_risk=result["risk_score"] >= RISK_THRESHOLD_HIGH,
    )


@router.get("/entries", response_model=List[EntryResponse])
def list_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Historial de entradas, para la pantalla de grafica de evolucion."""
    rows = (
        db.query(JournalEntry)
        .filter(JournalEntry.owner_id == current_user.id)
        .order_by(JournalEntry.created_at.asc())
        .all()
    )
    return [
        EntryResponse(
            id=row.id,
            text=decrypt_text(row.text),
            depression_score=row.depression_score,
            suicide_risk_score=row.suicide_risk_score,
            risk_score=row.risk_score,
            category=row.category,
            created_at=row.created_at,
        )
        for row in rows
    ]