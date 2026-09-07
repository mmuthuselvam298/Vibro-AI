import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session


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
    res = client.post("/api/engines", json={
        "uav_id": "UAV-MNT-1",
        "engine_model": "MALE-Piston-Demo",
        "serial_number": "ENG-MNT-101",
        "health_score": 95.0,
    })
    return res.json()["id"]


def test_create_maintenance_action_success(client: TestClient, sample_engine_id: int):
    payload = {
        "urgency": "PRIORITY_REVIEW",
        "prescribed_action": "Inspect spark ignition harness and injector coil on cylinder #3.",
        "action_type": "INSPECTION",
        "target_component": "FUEL_INJECTOR",
        "status": "OPEN",
        "technician_notes": "Logged after misfire signature observed.",
    }
    res = client.post(f"/api/engines/{sample_engine_id}/maintenance/actions", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["id"] is not None
    assert data["engine_id"] == sample_engine_id
    assert data["urgency"] == "PRIORITY_REVIEW"
    assert data["target_component"] == "FUEL_INJECTOR"
    assert data["status"] == "OPEN"


def test_create_maintenance_action_nonexistent_engine(client: TestClient):
    payload = {
        "prescribed_action": "General engine overhaul",
    }
    res = client.post("/api/engines/99999/maintenance/actions", json=payload)
    assert res.status_code == 404
    assert "does not exist" in res.json()["detail"].lower()


def test_create_maintenance_invalid_urgency(client: TestClient, sample_engine_id: int):
    payload = {
        "urgency": "SUPER_URGENT_NOW",  # Invalid
        "prescribed_action": "Emergency fix",
    }
    res = client.post(f"/api/engines/{sample_engine_id}/maintenance/actions", json=payload)
    assert res.status_code == 422


def test_get_maintenance_history_and_filter(client: TestClient, sample_engine_id: int):
    # Log 2 actions
    client.post(f"/api/engines/{sample_engine_id}/maintenance/actions", json={
        "urgency": "NEXT_SCHEDULED_INSPECTION",
        "prescribed_action": "Standard oil filter change",
        "status": "COMPLETED",
    })
    client.post(f"/api/engines/{sample_engine_id}/maintenance/actions", json={
        "urgency": "IMMEDIATE_REVIEW",
        "prescribed_action": "Emergency teardown review",
        "status": "OPEN",
    })

    # Get all history (newest first)
    hist_res = client.get(f"/api/engines/{sample_engine_id}/maintenance")
    assert hist_res.status_code == 200
    records = hist_res.json()
    assert len(records) == 2
    assert records[0]["urgency"] == "IMMEDIATE_REVIEW"  # Newest first

    # Filter by status
    open_res = client.get(f"/api/engines/{sample_engine_id}/maintenance?status=OPEN")
    assert open_res.status_code == 200
    assert len(open_res.json()) == 1
    assert open_res.json()[0]["status"] == "OPEN"


def test_advisories_baseline_nominal(client: TestClient, sample_engine_id: int):
    # Engine with no active faults should return nominal baseline advisory without flight clearance wording
    res = client.get(f"/api/engines/{sample_engine_id}/maintenance/advisories")
    assert res.status_code == 200
    advisories = res.json()
    assert len(advisories) >= 1
    assert advisories[0]["urgency"] == "NONE"
    assert "no active fault-based maintenance advisory" in advisories[0]["prescribed_action"].lower()
    assert "cleared for flight" not in advisories[0]["prescribed_action"].lower()
    assert advisories[0]["advisory_source"] == "RULE_BASED_HEURISTIC"


def test_advisories_generated_from_active_fault(client: TestClient, sample_engine_id: int):
    # 1. Post an active critical bearing wear fault
    client.post(f"/api/engines/{sample_engine_id}/faults", json={
        "fault_code": "SEVERE_BEARING_WEAR",
        "fault_title": "Severe Bearing Outer-Race Flaking",
        "affected_component": "BEARING",
        "severity": "CRITICAL",
        "confidence": 0.976,
        "fusion_summary": "High BPFO harmonics + Kurtosis 8.7.",
    })

    # 2. Retrieve advisories
    res = client.get(f"/api/engines/{sample_engine_id}/maintenance/advisories")
    assert res.status_code == 200
    advisories = res.json()
    assert len(advisories) == 1
    assert advisories[0]["target_component"] == "BEARING"
    assert advisories[0]["urgency"] == "IMMEDIATE_REVIEW"
    assert "main bearing condition" in advisories[0]["prescribed_action"].lower()
    assert "cycles" not in advisories[0]["prescribed_action"].lower()
    assert advisories[0]["advisory_source"] == "RULE_BASED_HEURISTIC"


def test_maintenance_endpoints_nonexistent_engine(client: TestClient):
    # History 404
    r1 = client.get("/api/engines/99999/maintenance")
    assert r1.status_code == 404

    # Advisories 404
    r2 = client.get("/api/engines/99999/maintenance/advisories")
    assert r2.status_code == 404
