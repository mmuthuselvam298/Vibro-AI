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
        existing_tables = {r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
        for table_name, table in SQLModel.metadata.tables.items():
            if table_name in existing_tables:
                existing_cols = {r[1] for r in cur.execute(f"PRAGMA table_info({table_name})").fetchall()}
                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = "TEXT"
                        type_str = str(col.type).upper()
                        if "INT" in type_str:
                            col_type = "INTEGER"
                        elif "FLOAT" in type_str or "REAL" in type_str:
                            col_type = "FLOAT"
                        elif "BOOL" in type_str:
                            col_type = "BOOLEAN"
                        elif "DATETIME" in type_str:
                            col_type = "DATETIME"

                        default_clause = ""
                        if col.default is not None and hasattr(col.default, "arg"):
                            val = col.default.arg
                            if isinstance(val, (int, float, bool)):
                                default_clause = f" DEFAULT {int(val) if isinstance(val, bool) else val}"
                            elif isinstance(val, str):
                                default_clause = f" DEFAULT '{val}'"
                        elif col.nullable:
                            default_clause = " DEFAULT NULL"
                        elif col_type == "BOOLEAN":
                            default_clause = " DEFAULT 1"

                        cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type}{default_clause}")
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