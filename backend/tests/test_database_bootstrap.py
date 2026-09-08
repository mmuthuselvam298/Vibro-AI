import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session, select
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import (
    get_session,
    create_db_and_tables,
    bootstrap_demo_dataset,
)
from app.models.engine import Engine
from app.models.uav import UAV


@pytest.fixture(name="fresh_bootstrap_db")
def fresh_bootstrap_db_fixture():
    """Provides a clean isolated in-memory engine and bootstraps demo records."""
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Initialize tables and bootstrap demo dataset on the isolated test engine
    create_db_and_tables(test_engine)

    def get_test_session():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_test_session
    with TestClient(app) as client:
        yield client, test_engine
    app.dependency_overrides.clear()


def test_fresh_empty_database_gets_demo_engine():
    """Verify that a fresh empty database automatically gets the demo UAV and engine."""
    isolated_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    create_db_and_tables(isolated_engine)

    with Session(isolated_engine) as session:
        uavs = session.exec(select(UAV)).all()
        assert len(uavs) == 1
        assert uavs[0].id == "UAV-001"
        assert uavs[0].tail_number == "UAV-001"
        assert uavs[0].model == "MALE-UAV-Demo"

        engines = session.exec(select(Engine)).all()
        assert len(engines) == 1
        assert engines[0].id == 1
        assert engines[0].uav_id == "UAV-001"
        assert engines[0].serial_number == "ENG-001"
        assert engines[0].engine_model == "MALE-Piston-Demo"
        assert engines[0].health_score == 100.0
        assert engines[0].status == "NOMINAL"
        assert engines[0].is_simulated is True


def test_repeated_initialization_does_not_duplicate_engine():
    """Verify that calling bootstrap repeatedly is idempotent and does not create duplicates."""
    isolated_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    create_db_and_tables(isolated_engine)

    # Call bootstrap multiple times as happens across cold starts or concurrent calls
    for _ in range(5):
        bootstrap_demo_dataset(isolated_engine)
        create_db_and_tables(isolated_engine)

    with Session(isolated_engine) as session:
        engines = session.exec(select(Engine)).all()
        assert len(engines) == 1
        assert engines[0].id == 1

        uavs = session.exec(select(UAV)).all()
        assert len(uavs) == 1


def test_get_engines_returns_seeded_engine(fresh_bootstrap_db):
    """Verify that GET /api/engines returns the seeded demo engine."""
    client, _ = fresh_bootstrap_db
    response = client.get("/api/engines")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    demo_engine = data[0]
    assert demo_engine["id"] == 1
    assert demo_engine["serial_number"] == "ENG-001"
    assert demo_engine["engine_model"] == "MALE-Piston-Demo"
    assert demo_engine["uav_id"] == "UAV-001"
    assert demo_engine["status"] == "NOMINAL"
    assert demo_engine["health_score"] == 100.0


def test_get_engine_digital_twin_returns_200_after_bootstrap(fresh_bootstrap_db):
    """Verify that GET /api/engines/1/digital-twin returns HTTP 200 after bootstrap."""
    client, _ = fresh_bootstrap_db
    response = client.get("/api/engines/1/digital-twin")
    assert response.status_code == 200

    data = response.json()
    assert data["engine_id"] == 1
    assert data["engine_serial_number"] == "ENG-001"
    assert data["operational_status"] == "NOMINAL"
    assert data["overall_health_score"] == 100.0

    subsystems = data["subsystems"]
    assert "MECHANICAL" in subsystems
    assert "THERMAL" in subsystems
    assert "LUBRICATION" in subsystems
    assert "COMBUSTION_FUEL" in subsystems
    assert "ELECTRICAL" in subsystems
    assert "OPERATING_CONTEXT" in subsystems
