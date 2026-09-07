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


def test_get_engines_empty(client: TestClient):
    response = client.get("/api/engines")
    assert response.status_code == 200
    assert response.json() == []


def test_create_and_get_engine(client: TestClient):
    payload = {
        "uav_id": "UAV-TEST-1",
        "engine_model": "MALE-Piston-Demo",
        "serial_number": "ENG-SN-1001",
        "health_score": 99.5,
        "status": "NOMINAL",
        "total_runtime_hours": 0.0,
        "total_operating_cycles": 0,
    }

    create_res = client.post("/api/engines", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["id"] is not None
    assert created["serial_number"] == "ENG-SN-1001"
    assert created["health_score"] == 99.5

    # Get by ID
    get_res = client.get(f"/api/engines/{created['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["serial_number"] == "ENG-SN-1001"

    # List all
    list_res = client.get("/api/engines")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1


def test_get_engine_not_found(client: TestClient):
    response = client.get("/api/engines/99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_duplicate_serial_number_returns_409(client: TestClient):
    payload = {
        "uav_id": "UAV-TEST-1",
        "engine_model": "MALE-Piston-Demo",
        "serial_number": "ENG-UNIQUE-99",
        "health_score": 95.0,
    }

    res1 = client.post("/api/engines", json=payload)
    assert res1.status_code == 201

    # Attempt duplicate insert
    res2 = client.post("/api/engines", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_invalid_health_score_returns_422(client: TestClient):
    payload = {
        "uav_id": "UAV-TEST-1",
        "engine_model": "MALE-Piston-Demo",
        "serial_number": "ENG-INVALID-HEALTH",
        "health_score": 150.0,  # Invalid: > 100
    }
    res = client.post("/api/engines", json=payload)
    assert res.status_code == 422


def test_empty_serial_number_returns_422(client: TestClient):
    payload = {
        "uav_id": "UAV-TEST-1",
        "engine_model": "MALE-Piston-Demo",
        "serial_number": "   ",  # Invalid empty/whitespace
        "health_score": 90.0,
    }
    res = client.post("/api/engines", json=payload)
    assert res.status_code == 422
