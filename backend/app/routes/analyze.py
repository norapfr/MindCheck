from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Tuple

from app.crypto import encrypt_text, decrypt_text
from app.config import RISK_THRESHOLD_HIGH, MIN_WORDS_AFTER_CLEANING
from app.database import get_db, JournalEntry, User
from app.deps import get_current_user
from app.model.language import is_english
from app.model.preprocessing import clean_text
from app.limiter import limiter

router = APIRouter()


class PreprocessRequest(BaseModel):
    text: str


class PreprocessResponse(BaseModel):
    cleaned_text: str
    word_count: int


class SubmitEntryRequest(BaseModel):
    text: str
    depression_score: float = Field(ge=0.0, le=1.0)
    suicide_risk_score: float = Field(ge=0.0, le=1.0)


class AnalyzeResponse(BaseModel):
    depression_score: float
    suicide_risk_score: float
    risk_score: float
    category: str
    high_risk: bool


class EntryResponse(BaseModel):
    id: int
    text: str
    depression_score: float
    suicide_risk_score: float
    risk_score: float
    category: str
    created_at: datetime

    class Config:
        from_attributes = True


def _classify(risk_score: float) -> Tuple[str, bool]:
    if risk_score >= 0.7:
        category = "high"
    elif risk_score >= 0.4:
        category = "moderate"
    else:
        category = "low"
    return category, risk_score >= RISK_THRESHOLD_HIGH


@router.post("/preprocess", response_model=PreprocessResponse)
@limiter.limit("30/minute")
def preprocess(request: Request, payload: PreprocessRequest):
    if not is_english(payload.text):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="not_english")

    cleaned = clean_text(payload.text)
    word_count = len(cleaned.split())
    if word_count < MIN_WORDS_AFTER_CLEANING:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "too_short", "word_count": word_count, "min_words": MIN_WORDS_AFTER_CLEANING},
        )

    return PreprocessResponse(cleaned_text=cleaned, word_count=word_count)


@router.post("/entries", response_model=AnalyzeResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def submit_entry(
    request: Request,
    payload: SubmitEntryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    risk_score = max(payload.depression_score, payload.suicide_risk_score)
    category, high_risk = _classify(risk_score)

    entry = JournalEntry(
        owner_id=current_user.id,
        text=encrypt_text(payload.text),
        depression_score=payload.depression_score,
        suicide_risk_score=payload.suicide_risk_score,
        risk_score=risk_score,
        category=category,
    )
    db.add(entry)
    db.commit()

    return AnalyzeResponse(
        depression_score=payload.depression_score,
        suicide_risk_score=payload.suicide_risk_score,
        risk_score=risk_score,
        category=category,
        high_risk=high_risk,
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