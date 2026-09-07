from datetime import datetime, timezone, timedelta
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


@pytest.fixture(name="setup_data")
def setup_fixture(client: TestClient):
    # Engine 1
    e1_res = client.post("/api/engines", json={
        "uav_id": "UAV-FLT-1",
        "engine_model": "MALE-Piston-Demo",
        "serial_number": "ENG-FLT-001",
        "health_score": 100.0,
    })
    e1_id = e1_res.json()["id"]

    # Engine 2
    e2_res = client.post("/api/engines", json={
        "uav_id": "UAV-FLT-2",
        "engine_model": "MALE-Piston-Demo",
        "serial_number": "ENG-FLT-002",
        "health_score": 90.0,
    })
    e2_id = e2_res.json()["id"]

    # Mission assigned to Engine 1
    m_res = client.post("/api/missions", json={
        "engine_id": e1_id,
        "mission_code": "MSN-FLT-101",
        "status": "ACTIVE",
    })
    m_id = m_res.json()["id"]

    return {"e1_id": e1_id, "e2_id": e2_id, "m_id": m_id}


def test_create_fault_event_success(client: TestClient, setup_data: dict):
    e1_id = setup_data["e1_id"]
    m_id = setup_data["m_id"]

    payload = {
        "mission_id": m_id,
        "fault_code": "EARLY_BEARING_WEAR",
        "fault_title": "Bearing Outer-Race Spalling (BPFO)",
        "affected_component": "BEARING",
        "severity": "MEDIUM",
        "confidence": 0.868,
        "evidence_consistency": "MECHANICAL_FAULT_LIKELY",
        "evidence": [
            "BPFO 150 Hz peak identified at 3,600 RPM",
            "Vibration RMS elevated to 1.82g",
            "Oil Temperature increased +3°C",
        ],
        "fusion_summary": "Vibration ↑ + BPFO 150Hz harmonic confirmed.",
    }

    res = client.post(f"/api/engines/{e1_id}/faults", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["id"] is not None
    assert data["engine_id"] == e1_id
    assert data["mission_id"] == m_id
    assert data["fault_code"] == "EARLY_BEARING_WEAR"
    assert data["confidence"] == 0.868
    assert len(data["evidence"]) == 3
    assert "BPFO 150 Hz" in data["evidence"][0]


def test_create_fault_nonexistent_engine(client: TestClient):
    payload = {
        "fault_code": "PISTON_SLAP",
        "fault_title": "Piston Slap",
        "severity": "HIGH",
        "confidence": 0.9,
    }
    res = client.post("/api/engines/99999/faults", json=payload)
    assert res.status_code == 404
    assert "does not exist" in res.json()["detail"].lower()


def test_create_fault_nonexistent_mission(client: TestClient, setup_data: dict):
    e1_id = setup_data["e1_id"]
    payload = {
        "mission_id": 99999,  # Nonexistent mission
        "fault_code": "PISTON_SLAP",
        "fault_title": "Piston Slap",
        "severity": "HIGH",
        "confidence": 0.9,
    }
    res = client.post(f"/api/engines/{e1_id}/faults", json=payload)
    assert res.status_code == 404
    assert "mission with id 99999 does not exist" in res.json()["detail"].lower()


def test_create_fault_mission_mismatch(client: TestClient, setup_data: dict):
    e2_id = setup_data["e2_id"]
    m_id = setup_data["m_id"]  # Belongs to Engine 1, not Engine 2

    payload = {
        "mission_id": m_id,
        "fault_code": "VALVE_LASH",
        "fault_title": "Excessive Exhaust Valve Lash Gap",
        "severity": "MEDIUM",
        "confidence": 0.85,
    }
    res = client.post(f"/api/engines/{e2_id}/faults", json=payload)
    assert res.status_code == 400
    assert "assigned to engine" in res.json()["detail"].lower()


def test_create_fault_invalid_severity(client: TestClient, setup_data: dict):
    e1_id = setup_data["e1_id"]
    payload = {
        "fault_code": "OVERHEATING",
        "fault_title": "Thermal Runaway",
        "severity": "APOCALYPTIC",  # Invalid
        "confidence": 0.95,
    }
    res = client.post(f"/api/engines/{e1_id}/faults", json=payload)
    assert res.status_code == 422


def test_create_fault_invalid_confidence(client: TestClient, setup_data: dict):
    e1_id = setup_data["e1_id"]
    # Test confidence > 1.0
    payload_high = {
        "fault_code": "MISFIRE",
        "fault_title": "Combustion Misfire",
        "severity": "HIGH",
        "confidence": 1.45,
    }
    res_high = client.post(f"/api/engines/{e1_id}/faults", json=payload_high)
    assert res_high.status_code == 422

    # Test confidence < 0.0
    payload_low = {
        "fault_code": "MISFIRE",
        "fault_title": "Combustion Misfire",
        "severity": "HIGH",
        "confidence": -0.2,
    }
    res_low = client.post(f"/api/engines/{e1_id}/faults", json=payload_low)
    assert res_low.status_code == 422


def test_get_faults_and_filtering(client: TestClient, setup_data: dict):
    e1_id = setup_data["e1_id"]
    base_time = datetime(2026, 9, 8, 12, 0, 0, tzinfo=timezone.utc)

    # Ingest 3 fault events with different timestamps and severities
    client.post(f"/api/engines/{e1_id}/faults", json={
        "fault_code": "VALVE_LASH",
        "fault_title": "Valve Lash",
        "severity": "LOW",
        "confidence": 0.8,
        "timestamp": (base_time - timedelta(minutes=30)).isoformat(),
    })
    client.post(f"/api/engines/{e1_id}/faults", json={
        "fault_code": "EARLY_BEARING_WEAR",
        "fault_title": "Early Bearing Wear",
        "severity": "MEDIUM",
        "confidence": 0.85,
        "timestamp": (base_time - timedelta(minutes=15)).isoformat(),
    })
    client.post(f"/api/engines/{e1_id}/faults", json={
        "fault_code": "SEVERE_BEARING_WEAR",
        "fault_title": "Severe Bearing Wear",
        "severity": "CRITICAL",
        "confidence": 0.98,
        "timestamp": base_time.isoformat(),
    })

    # 1. Retrieve all (verify newest first)
    all_res = client.get(f"/api/engines/{e1_id}/faults")
    assert all_res.status_code == 200
    events = all_res.json()
    assert len(events) == 3
    assert events[0]["severity"] == "CRITICAL"  # Newest
    assert events[2]["severity"] == "LOW"       # Oldest

    # 2. Filter by severity
    crit_res = client.get(f"/api/engines/{e1_id}/faults?severity=CRITICAL")
    assert crit_res.status_code == 200
    assert len(crit_res.json()) == 1
    assert crit_res.json()[0]["fault_code"] == "SEVERE_BEARING_WEAR"

    # 3. Filter by fault_code
    valve_res = client.get(f"/api/engines/{e1_id}/faults?fault_code=VALVE_LASH")
    assert valve_res.status_code == 200
    assert len(valve_res.json()) == 1


def test_get_single_fault_event(client: TestClient, setup_data: dict):
    e1_id = setup_data["e1_id"]
    create_res = client.post(f"/api/engines/{e1_id}/faults", json={
        "fault_code": "LUBRICATION_ISSUE",
        "fault_title": "Low Oil Pressure",
        "severity": "CRITICAL",
        "confidence": 0.96,
    })
    fid = create_res.json()["id"]

    # Retrieve by ID
    get_res = client.get(f"/api/engines/{e1_id}/faults/{fid}")
    assert get_res.status_code == 200
    assert get_res.json()["fault_code"] == "LUBRICATION_ISSUE"

    # Not found
    not_found = client.get(f"/api/engines/{e1_id}/faults/99999")
    assert not_found.status_code == 404
