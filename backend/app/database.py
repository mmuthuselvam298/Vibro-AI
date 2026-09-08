import os
import sqlite3
from typing import Generator
from sqlmodel import SQLModel, create_engine, Session
from . import models  # noqa: F401 - ensures all SQLModel tables are registered in metadata

def _resolve_database_url() -> str:
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    bundled_db = os.path.join(backend_dir, "vibro_ai.db")

    if os.getenv("VERCEL"):
        # On Vercel serverless, root filesystem is read-only.
        # Use /tmp which is writable across the container execution.
        tmp_db = "/tmp/vibro_ai.db"
        if not os.path.exists(tmp_db) and os.path.exists(bundled_db):
            try:
                import shutil
                shutil.copyfile(bundled_db, tmp_db)
            except Exception:
                pass
        return f"sqlite:///{tmp_db}"

    # Local development:
    # If running from backend/ directory, use ./vibro_ai.db
    if os.path.exists("./vibro_ai.db"):
        return "sqlite:///./vibro_ai.db"
    # If running from repository root, use backend/vibro_ai.db if present
    if os.path.exists(bundled_db):
        return f"sqlite:///{bundled_db}"

    return "sqlite:///./vibro_ai.db"


DATABASE_URL = _resolve_database_url()

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


def bootstrap_demo_dataset(target_engine=None):
    """
    Idempotently bootstrap the demo UAV and Engine records if the database has no engines.

    Guarantees:
    - Checks if any engine exists; if so, does nothing (preserves existing data).
    - Ensures demo UAV 'UAV-001' exists for foreign key integrity.
    - Creates primary demo Engine with id=1, uav_id='UAV-001', engine_model='MALE-Piston-Demo',
      serial_number='ENG-001', health_score=100.0, status='NOMINAL'.
    - Handles concurrent initializations safely and idempotently.
    """
    from sqlmodel import select
    from .models.engine import Engine
    from .models.uav import UAV

    use_engine = target_engine or engine

    try:
        with Session(use_engine) as session:
            # 1. If any engine already exists, preserve all existing records
            existing_engine = session.exec(select(Engine)).first()
            if existing_engine is not None:
                return

            # 2. Ensure parent UAV-001 exists for foreign key integrity
            uav_id = "UAV-001"
            existing_uav = session.get(UAV, uav_id)
            if existing_uav is None:
                demo_uav = UAV(
                    id=uav_id,
                    tail_number="UAV-001",
                    model="MALE-UAV-Demo",
                    status="MISSION_ACTIVE",
                    total_flight_hours=0.0,
                )
                session.add(demo_uav)
                session.commit()

            # 3. Create primary demo Engine record with ID 1
            demo_engine = Engine(
                id=1,
                uav_id=uav_id,
                engine_model="MALE-Piston-Demo",
                serial_number="ENG-001",
                health_score=100.0,
                status="NOMINAL",
                total_runtime_hours=0.0,
                total_operating_cycles=0,
                is_simulated=True,
            )
            session.add(demo_engine)
            session.commit()
    except Exception:
        # Avoid crashing startup if concurrent process or cold-start already inserted
        pass


_db_initialized = False


def create_db_and_tables(target_engine=None):
    """Create all registered database tables, ensure column compatibility, and bootstrap demo data."""
    global _db_initialized
    use_engine = target_engine or engine
    _ensure_sqlite_column_compatibility()
    SQLModel.metadata.create_all(use_engine)
    bootstrap_demo_dataset(use_engine)
    _db_initialized = True


def ensure_db_initialized():
    """Ensure database tables and demo dataset are initialized on first access."""
    if not _db_initialized:
        create_db_and_tables()


def get_session() -> Generator[Session, None, None]:
    """Reusable FastAPI dependency for database sessions."""
    ensure_db_initialized()
    with Session(engine) as session:
        yield session