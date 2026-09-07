import time
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session
from app.services.telemetry_buffer import telemetry_buffer


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
    telemetry_buffer.reset()

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    telemetry_buffer.reset()


@pytest.fixture(name="setup_engines_and_mission")
def setup_data(client: TestClient):
    # Engine 1
    res1 = client.post("/api/engines", json={
        "uav_id": "UAV-TEL-1",
        "engine_model": "MALE-Piston-Demo",
        "serial_number": "ENG-TEL-001",
        "health_score": 100.0,
    })
    e1_id = res1.json()["id"]

    # Engine 2
    res2 = client.post("/api/engines", json={
        "uav_id": "UAV-TEL-2",
        "engine_model": "MALE-Piston-Demo",
        "serial_number": "ENG-TEL-002",
        "health_score": 90.0,
    })
    e2_id = res2.json()["id"]

    # Mission for Engine 1
    m_res = client.post("/api/missions", json={
        "engine_id": e1_id,
        "mission_code": "MSN-TEL-101",
        "status": "ACTIVE",
    })
    m_id = m_res.json()["id"]

    return {"e1_id": e1_id, "e2_id": e2_id, "m_id": m_id}


def test_telemetry_ingest_success_and_latest(client: TestClient, setup_engines_and_mission: dict):
    e1_id = setup_engines_and_mission["e1_id"]
    m_id = setup_engines_and_mission["m_id"]

    frame_payload = {
        "engine_id": e1_id,
        "mission_id": m_id,
        "mission_time_seconds": 30.0,
        "operating_cycle": 10,
        "rpm": 3610.0,
        "cht": 153.2,
        "egt": 712.0,
        "oil_pressure": 4.6,
        "oil_temp": 88.5,
        "fuel_flow": 17.8,
        "vibration_rms": 0.86,
        "battery_voltage": 28.1,
        "injection_timing": 28.0,
        "expected_rpm": 3600.0,
        "expected_cht": 152.0,
        "status": "NORMAL",
    }

    # Ingest frame
    res = client.post("/api/telemetry/ingest", json=frame_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "persisted"
    assert data["persisted_to_db"] is True
    assert data["frame_id"] is not None

    # Retrieve latest
    latest_res = client.get(f"/api/engines/{e1_id}/telemetry/latest")
    assert latest_res.status_code == 200
    latest = latest_res.json()
    assert latest["rpm"] == 3610.0
    assert latest["cht"] == 153.2
    assert latest["mission_id"] == m_id


def test_telemetry_engine_validation(client: TestClient):
    payload = {
        "engine_id": 99999,  # Nonexistent
        "rpm": 3600.0,
        "cht": 150.0,
        "egt": 700.0,
        "oil_pressure": 4.5,
        "oil_temp": 85.0,
        "fuel_flow": 18.0,
        "vibration_rms": 0.8,
    }
    res = client.post("/api/telemetry/ingest", json=payload)
    assert res.status_code == 404
    assert "engine with id 99999 does not exist" in res.json()["detail"].lower()


def test_telemetry_mission_validation_nonexistent(client: TestClient, setup_engines_and_mission: dict):
    e1_id = setup_engines_and_mission["e1_id"]
    payload = {
        "engine_id": e1_id,
        "mission_id": 88888,  # Nonexistent mission
        "rpm": 3600.0,
        "cht": 150.0,
        "egt": 700.0,
        "oil_pressure": 4.5,
        "oil_temp": 85.0,
        "fuel_flow": 18.0,
        "vibration_rms": 0.8,
    }
    res = client.post("/api/telemetry/ingest", json=payload)
    assert res.status_code == 404
    assert "mission with id 88888 does not exist" in res.json()["detail"].lower()


def test_telemetry_mission_mismatch_engine(client: TestClient, setup_engines_and_mission: dict):
    e2_id = setup_engines_and_mission["e2_id"]
    m_id = setup_engines_and_mission["m_id"]  # Belongs to e1_id, not e2_id

    payload = {
        "engine_id": e2_id,
        "mission_id": m_id,
        "rpm": 3600.0,
        "cht": 150.0,
        "egt": 700.0,
        "oil_pressure": 4.5,
        "oil_temp": 85.0,
        "fuel_flow": 18.0,
        "vibration_rms": 0.8,
    }
    res = client.post("/api/telemetry/ingest", json=payload)
    assert res.status_code == 400
    assert "assigned to engine" in res.json()["detail"].lower()


def test_telemetry_sampling_and_buffering_behavior(client: TestClient, setup_engines_and_mission: dict):
    e1_id = setup_engines_and_mission["e1_id"]

    # 1. First frame should persist
    t0 = time.time()
    telemetry_buffer.min_interval_seconds = 2.0

    f1 = {
        "engine_id": e1_id,
        "rpm": 3600.0,
        "cht": 150.0,
        "egt": 700.0,
        "oil_pressure": 4.5,
        "oil_temp": 85.0,
        "fuel_flow": 18.0,
        "vibration_rms": 0.8,
    }
    res1 = client.post("/api/telemetry/ingest", json=f1)
    assert res1.status_code == 200
    assert res1.json()["persisted_to_db"] is True
    assert res1.json()["status"] == "persisted"

    # 2. Second frame immediately after (e.g. simulated 50 ms tick) should be buffered in memory only
    f2 = {
        "engine_id": e1_id,
        "rpm": 3650.0,  # distinct RPM
        "cht": 151.0,
        "egt": 705.0,
        "oil_pressure": 4.5,
        "oil_temp": 85.2,
        "fuel_flow": 18.1,
        "vibration_rms": 0.82,
    }
    res2 = client.post("/api/telemetry/ingest", json=f2)
    assert res2.status_code == 200
    assert res2.json()["persisted_to_db"] is False
    assert res2.json()["status"] == "buffered_in_memory"

    # 3. GET /latest should immediately serve the buffered f2 frame (3650 RPM) without waiting for DB flush!
    latest_res = client.get(f"/api/engines/{e1_id}/telemetry/latest")
    assert latest_res.status_code == 200
    assert latest_res.json()["rpm"] == 3650.0

    # 4. Advance time past the sampling window (>= 2.0s)
    # Manually trigger should_persist by setting previous record to 3.0s ago
    telemetry_buffer._last_persisted_time[e1_id] = t0 - 5.0

    f3 = {
        "engine_id": e1_id,
        "rpm": 3580.0,
        "cht": 152.0,
        "egt": 710.0,
        "oil_pressure": 4.6,
        "oil_temp": 86.0,
        "fuel_flow": 17.9,
        "vibration_rms": 0.85,
    }
    res3 = client.post("/api/telemetry/ingest", json=f3)
    assert res3.status_code == 200
    assert res3.json()["persisted_to_db"] is True
    assert res3.json()["status"] == "persisted"


def test_telemetry_history_filtering(client: TestClient, setup_engines_and_mission: dict):
    e1_id = setup_engines_and_mission["e1_id"]
    telemetry_buffer.min_interval_seconds = 0.0  # Allow all test frames to persist for history testing

    base_time = datetime(2026, 9, 8, 10, 0, 0, tzinfo=timezone.utc)

    # Ingest 3 frames spaced by 10 minutes
    for i in range(3):
        t = base_time + timedelta(minutes=i * 10)
        client.post("/api/telemetry/ingest", json={
            "engine_id": e1_id,
            "timestamp": t.isoformat(),
            "rpm": 3600.0 + i * 10,
            "cht": 150.0 + i,
            "egt": 700.0,
            "oil_pressure": 4.5,
            "oil_temp": 85.0,
            "fuel_flow": 18.0,
            "vibration_rms": 0.8,
        })

    # Retrieve all
    all_hist = client.get(f"/api/engines/{e1_id}/telemetry/history")
    assert all_hist.status_code == 200
    frames = all_hist.json()
    assert len(frames) == 3
    assert frames[0]["rpm"] == 3600.0
    assert frames[1]["rpm"] == 3610.0
    assert frames[2]["rpm"] == 3620.0

    # Filter with limit=2
    lim_hist = client.get(f"/api/engines/{e1_id}/telemetry/history?limit=2")
    assert lim_hist.status_code == 200
    assert len(lim_hist.json()) == 2

    # Filter with start_time
    filter_start = (base_time + timedelta(minutes=15)).isoformat()
    filt_hist = client.get(f"/api/engines/{e1_id}/telemetry/history", params={"start_time": filter_start})
    assert filt_hist.status_code == 200
    assert len(filt_hist.json()) == 1
    assert filt_hist.json()[0]["rpm"] == 3620.0


def test_latest_telemetry_not_found(client: TestClient, setup_engines_and_mission: dict):
    e2_id = setup_engines_and_mission["e2_id"]  # Has no telemetry
    res = client.get(f"/api/engines/{e2_id}/telemetry/latest")
    assert res.status_code == 404
    assert "no telemetry recorded" in res.json()["detail"].lower()
