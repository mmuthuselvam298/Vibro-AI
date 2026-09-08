import os
import sqlite3
from typing import Generator
from sqlmodel import SQLModel, create_engine, Session
from . import models  # noqa: F401 - ensures all SQLModel tables are registered in metadata

def _resolve_database_url() -> str:
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        if env_url.startswith("postgres://"):
            env_url = env_url.replace("postgres://", "postgresql://", 1)
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
    Idempotently bootstrap the demo UAV, Engine, and baseline operational records.

    Guarantees:
    - Ensures demo UAV 'UAV-001' exists for foreign key integrity.
    - Creates primary demo Engine with id=1, uav_id='UAV-001', engine_model='MALE-Piston-Demo',
      serial_number='ENG-001', health_score=100.0, status='NOMINAL'.
    - Idempotently creates baseline TelemetryFrame, VibrationBurst, VibrationFeature,
      HealthRecord, and PrognosticSnapshot for Engine 1 so cold-start requests immediately
      return HTTP 200 without missing-resource 404 errors.
    - Handles concurrent initializations safely and idempotently.
    """
    from datetime import datetime, timezone
    from sqlmodel import select
    from .models.engine import Engine
    from .models.uav import UAV
    from .models.telemetry import TelemetryFrame
    from .models.vibration import VibrationBurst, VibrationFeature
    from .models.health import HealthRecord
    from .models.prognostics import PrognosticSnapshot

    use_engine = target_engine or engine

    try:
        with Session(use_engine) as session:
            # 1. Ensure parent UAV-001 exists for foreign key integrity
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

            # 2. Ensure primary demo Engine record with ID 1
            demo_engine = session.get(Engine, 1)
            if demo_engine is None:
                demo_engine = Engine(
                    id=1,
                    uav_id=uav_id,
                    engine_model="MALE-Piston-Demo",
                    serial_number="ENG-001",
                    health_score=100.0,
                    status="NOMINAL",
                    total_runtime_hours=0.0,
                    total_operating_cycles=142,
                    is_simulated=True,
                )
                session.add(demo_engine)
                session.commit()
                session.refresh(demo_engine)

            now = datetime.now(timezone.utc)

            # 3. Ensure baseline TelemetryFrame for Engine 1
            existing_telem = session.exec(
                select(TelemetryFrame).where(TelemetryFrame.engine_id == 1)
            ).first()
            if existing_telem is None:
                demo_telem = TelemetryFrame(
                    engine_id=1,
                    timestamp=now,
                    mission_time_seconds=0.0,
                    operating_cycle=142,
                    rpm=3600.0,
                    cht=165.0,
                    egt=720.0,
                    oil_pressure=4.2,
                    oil_temp=85.0,
                    fuel_flow=12.5,
                    vibration_rms=0.82,
                    battery_voltage=28.2,
                    injection_timing=28.0,
                    expected_rpm=3600.0,
                    expected_cht=165.0,
                    expected_egt=720.0,
                    expected_oil_pressure=4.2,
                    expected_oil_temp=85.0,
                    expected_fuel_flow=12.5,
                    expected_vibration_rms=0.80,
                    overall_deviation_score=0.0,
                    status="NORMAL",
                )
                session.add(demo_telem)
                session.commit()

            # 4. Ensure baseline VibrationBurst and VibrationFeature for Engine 1
            existing_burst = session.exec(
                select(VibrationBurst).where(VibrationBurst.engine_id == 1)
            ).first()
            if existing_burst is None:
                demo_burst = VibrationBurst(
                    engine_id=1,
                    timestamp=now,
                    sampling_rate_hz=1024,
                    sample_count=512,
                    duration_ms=500.0,
                    axis="Z",
                    trigger_reason="PERIODIC",
                    rpm=3600.0,
                    is_simulated=True,
                )
                session.add(demo_burst)
                session.commit()
                session.refresh(demo_burst)

                demo_feat = VibrationFeature(
                    burst_id=demo_burst.id,
                    timestamp=now,
                    rms=0.82,
                    peak=1.25,
                    peak_to_peak=2.45,
                    crest_factor=1.45,
                    kurtosis=3.0,
                    skewness=0.0,
                    mean=0.0,
                    std_dev=0.82,
                    dominant_frequency=60.0,
                    spectral_energy=1200.0,
                    harmonic_energy_1x=90.0,
                    harmonic_energy_2x=30.0,
                    harmonic_energy_4x=15.0,
                    bpfo_band_energy=8.0,
                    bsf_band_energy=6.0,
                    high_freq_energy_ratio=0.08,
                    dominant_order=1.0,
                    shaft_frequency_hz=60.0,
                )
                session.add(demo_feat)
                session.commit()

            # 5. Ensure baseline HealthRecord for Engine 1
            existing_health = session.exec(
                select(HealthRecord).where(HealthRecord.engine_id == 1)
            ).first()
            if existing_health is None:
                demo_health = HealthRecord(
                    engine_id=1,
                    timestamp=now,
                    operating_cycle=142,
                    health_score=100.0,
                    degradation_rate_per_100c=0.0,
                    is_simulated=True,
                )
                session.add(demo_health)
                session.commit()

            # 6. Ensure baseline PrognosticSnapshot for Engine 1
            existing_prog = session.exec(
                select(PrognosticSnapshot).where(PrognosticSnapshot.engine_id == 1)
            ).first()
            if existing_prog is None:
                demo_prog = PrognosticSnapshot(
                    engine_id=1,
                    timestamp=now,
                    rul_nominal_cycles=450,
                    rul_min_cycles=380,
                    rul_max_cycles=520,
                    confidence_percent=95.0,
                    mission_reliability_score=98.5,
                    mission_capability_status="MISSION_CAPABLE",
                    safe_operation_minutes=360,
                    margin_ratio=1.5,
                    recommended_action="CONTINUE_MISSION",
                    primary_reason="Vibration and mechanical parameters within baseline limits",
                )
                session.add(demo_prog)
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