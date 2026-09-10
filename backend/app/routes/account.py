from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.crypto import decrypt_text
from app.database import get_db, JournalEntry, User
from app.deps import get_current_user

router = APIRouter()


class ExportedEntry(BaseModel):
    id: int
    text: str
    depression_score: float
    suicide_risk_score: float
    risk_score: float
    category: str
    created_at: datetime


class ExportResponse(BaseModel):
    email: str
    account_created_at: datetime
    entries: list[ExportedEntry]


@router.get("/export", response_model=ExportResponse)
def export_my_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(JournalEntry)
        .filter(JournalEntry.owner_id == current_user.id)
        .order_by(JournalEntry.created_at.asc())
        .all()
    )
    return ExportResponse(
        email=current_user.email,
        account_created_at=current_user.created_at,
        entries=[
            ExportedEntry(
                id=row.id,
                text=decrypt_text(row.text),
                depression_score=row.depression_score,
                suicide_risk_score=row.suicide_risk_score,
                risk_score=row.risk_score,
                category=row.category,
                created_at=row.created_at,
            )
            for row in rows
        ],
    )


@router.delete("/", status_code=204)
def delete_my_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.delete(current_user)
    db.commit()