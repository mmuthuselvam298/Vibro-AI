import os
import sqlite3
from typing import Generator
from sqlmodel import SQLModel, create_engine, Session
from . import models  # noqa: F401 - ensures all SQLModel tables are registered in metadata

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vibro_ai.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)


def _ensure_sqlite_column_compatibility():
    """Ensure existing SQLite legacy databases have compatible schema additions."""
    if not DATABASE_URL.startswith("sqlite"):
        return

    db_path = DATABASE_URL.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        return

    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        if "engines" in tables:
            cols = [r[1] for r in cur.execute("PRAGMA table_info(engines)").fetchall()]
            if "total_operating_cycles" not in cols:
                cur.execute("ALTER TABLE engines ADD COLUMN total_operating_cycles INTEGER DEFAULT 0")
                conn.commit()
        conn.close()
    except Exception:
        pass


def create_db_and_tables():
    """Create all registered database tables and ensure column compatibility."""
    _ensure_sqlite_column_compatibility()
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Reusable FastAPI dependency for database sessions."""
    with Session(engine) as session:
        yield session