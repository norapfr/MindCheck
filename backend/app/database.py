from datetime import datetime

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

from app.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    password_changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    entries = relationship("JournalEntry", back_populates="owner", cascade="all, delete-orphan")

    
class JournalEntry(Base):
    """
    Diseñado para migrar sin dolor a Supabase/Firebase más adelante:
    claves simples, sin lógica específica de SQLite salvo el engine.
    """
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(String, nullable=False)
    depression_score = Column(Float, nullable=False)
    suicide_risk_score = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)  # max(depression_score, suicide_risk_score)
    category = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="entries")



class AppDownload(Base):
    __tablename__ = "app_downloads"

    id = Column(Integer, primary_key=True, index=True)
    downloaded_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()