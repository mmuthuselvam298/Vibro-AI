import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session
from app.models.engine import Engine


@pytest.fixture(name="client")
def client_fixture():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(test_engine)

    def get_test_session():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_test_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(name="sample_engine_id")
def sample_engine_fixture(client: TestClient):
    payload = {
        "uav_id": "UAV-M-01",
        "engine_model": "MALE-Piston-Demo",
        "serial_number": "ENG-MSN-101",
        "health_score": 100.0,
    }
    res = client.post("/api/engines", json=payload)
    assert res.status_code == 201
    return res.json()["id"]


def test_create_mission_success(client: TestClient, sample_engine_id: int):
    payload = {
        "engine_id": sample_engine_id,
        "mission_code": "MSN-2026-TEST",
        "profile_type": "ENDURANCE_CRUISE",
        "status": "PLANNED",
        "planned_duration_seconds": 7200,
        "notes": "Test tactical endurance sortie",
    }
    res = client.post("/api/missions", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["id"] is not None
    assert data["engine_id"] == sample_engine_id
    assert data["mission_code"] == "MSN-2026-TEST"
    assert data["status"] == "PLANNED"


def test_create_mission_invalid_engine(client: TestClient):
    payload = {
        "engine_id": 99999,  # Nonexistent
        "mission_code": "MSN-GHOST",
    }
    res = client.post("/api/missions", json=payload)
    assert res.status_code == 404
    assert "engine with id 99999 does not exist" in res.json()["detail"].lower()


def test_create_mission_invalid_status(client: TestClient, sample_engine_id: int):
    payload = {
        "engine_id": sample_engine_id,
        "mission_code": "MSN-BAD-STATUS",
        "status": "INVALID_STATE",
    }
    res = client.post("/api/missions", json=payload)
    assert res.status_code == 422
    assert "invalid mission status" in res.json()["detail"].lower()


def test_create_mission_empty_code(client: TestClient, sample_engine_id: int):
    payload = {
        "engine_id": sample_engine_id,
        "mission_code": "   ",
    }
    res = client.post("/api/missions", json=payload)
    assert res.status_code == 422


def test_get_missions_and_filter(client: TestClient, sample_engine_id: int):
    # Create two missions
    client.post("/api/missions", json={
        "engine_id": sample_engine_id,
        "mission_code": "MSN-001",
        "status": "PLANNED",
    })
    client.post("/api/missions", json={
        "engine_id": sample_engine_id,
        "mission_code": "MSN-002",
        "status": "ACTIVE",
    })

    # Get all
    all_res = client.get("/api/missions")
    assert all_res.status_code == 200
    assert len(all_res.json()) >= 2

    # Filter by status
    active_res = client.get("/api/missions?status=ACTIVE")
    assert active_res.status_code == 200
    assert all(m["status"] == "ACTIVE" for m in active_res.json())

    # Filter by engine_id
    eng_res = client.get(f"/api/missions?engine_id={sample_engine_id}")
    assert eng_res.status_code == 200
    assert len(eng_res.json()) >= 2


def test_get_single_mission_and_not_found(client: TestClient, sample_engine_id: int):
    create_res = client.post("/api/missions", json={
        "engine_id": sample_engine_id,
        "mission_code": "MSN-SINGLE",
    })
    mid = create_res.json()["id"]

    get_res = client.get(f"/api/missions/{mid}")
    assert get_res.status_code == 200
    assert get_res.json()["mission_code"] == "MSN-SINGLE"

    # 404 check
    not_found = client.get("/api/missions/99999")
    assert not_found.status_code == 404


def test_update_mission_lifecycle(client: TestClient, sample_engine_id: int):
    create_res = client.post("/api/missions", json={
        "engine_id": sample_engine_id,
        "mission_code": "MSN-UPDATE",
        "status": "PLANNED",
    })
    mid = create_res.json()["id"]

    # Transition to ACTIVE
    patch1 = client.patch(f"/api/missions/{mid}", json={"status": "ACTIVE", "elapsed_seconds": 150.0})
    assert patch1.status_code == 200
    assert patch1.json()["status"] == "ACTIVE"
    assert patch1.json()["elapsed_seconds"] == 150.0

    # Transition to COMPLETED
    patch2 = client.patch(f"/api/missions/{mid}", json={"status": "COMPLETED", "notes": "Sortie successful"})
    assert patch2.status_code == 200
    assert patch2.json()["status"] == "COMPLETED"
    assert patch2.json()["notes"] == "Sortie successful"

    # Invalid status update
    bad_patch = client.patch(f"/api/missions/{mid}", json={"status": "FLYING_NOWHERE"})
    assert bad_patch.status_code == 422
