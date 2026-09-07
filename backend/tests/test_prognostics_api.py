from datetime import datetime, timedelta, timezone
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


def create_demo_engine(client: TestClient, sn: str = "ENG-PROG-100") -> int:
    payload = {
        "uav_id": "UAV-PROG-01",
        "engine_model": "MALE-Piston-Demo",
        "serial_number": sn,
        "health_score": 92.0,
        "status": "NOMINAL",
    }
    res = client.post("/api/engines", json=payload)
    assert res.status_code == 201
    return res.json()["id"]


def create_demo_mission(client: TestClient, engine_id: int) -> int:
    payload = {
        "engine_id": engine_id,
        "mission_code": "MSN-PROG-01",
        "profile_type": "SURVEILLANCE",
        "planned_duration_seconds": 3600,
    }
    res = client.post("/api/missions", json=payload)
    assert res.status_code == 201
    return res.json()["id"]


def test_create_and_get_prognostic_snapshot(client: TestClient):
    engine_id = create_demo_engine(client)

    payload = {
        "rul_nominal_cycles": 145.0,
        "rul_min_cycles": 120.0,
        "rul_max_cycles": 170.0,
        "confidence_percent": 88.0,
        "mission_reliability_score": 93.5,
        "mission_capability_status": "CAPABLE",
        "safe_operation_minutes": 240.0,
        "margin_ratio": 1.45,
        "recommended_action": "CONTINUE_MISSION",
        "primary_reason": "Vibration within prototype thresholds",
    }

    res = client.post(f"/api/engines/{engine_id}/prognostics", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["id"] is not None
    assert data["engine_id"] == engine_id
    assert data["rul_nominal_cycles"] == 145.0
    assert data["mission_capability_status"] == "MISSION_CAPABLE"

    # Latest retrieval
    latest_res = client.get(f"/api/engines/{engine_id}/prognostics/latest")
    assert latest_res.status_code == 200
    assert latest_res.json()["rul_nominal_cycles"] == 145.0


def test_prognostic_snapshot_mission_validation(client: TestClient):
    eng1 = create_demo_engine(client, sn="ENG-SN-1")
    eng2 = create_demo_engine(client, sn="ENG-SN-2")
    m1 = create_demo_mission(client, eng1)

    # Valid: mission belongs to eng1
    valid_payload = {
        "mission_id": m1,
        "rul_nominal_cycles": 150.0,
        "confidence_percent": 90.0,
        "mission_reliability_score": 92.0,
    }
    res_valid = client.post(f"/api/engines/{eng1}/prognostics", json=valid_payload)
    assert res_valid.status_code == 201

    # Invalid: mission belongs to eng1, but submitted under eng2
    res_invalid = client.post(f"/api/engines/{eng2}/prognostics", json=valid_payload)
    assert res_invalid.status_code == 400
    assert "belongs to" in res_invalid.json()["detail"].lower()

    # Invalid: non-existent mission
    bad_mission_payload = {
        "mission_id": 99999,
        "rul_nominal_cycles": 150.0,
        "confidence_percent": 90.0,
        "mission_reliability_score": 92.0,
    }
    res_bad = client.post(f"/api/engines/{eng1}/prognostics", json=bad_mission_payload)
    assert res_bad.status_code == 404


def test_prognostic_history_and_latest_empty(client: TestClient):
    engine_id = create_demo_engine(client)

    # Empty initially
    assert client.get(f"/api/engines/{engine_id}/prognostics/latest").status_code == 404
    assert client.get(f"/api/engines/{engine_id}/prognostics").json() == []

    # Add multiple snapshots
    now = datetime.now(timezone.utc)
    for i in range(4):
        t = (now - timedelta(minutes=40 - (i * 10))).isoformat()
        client.post(
            f"/api/engines/{engine_id}/prognostics",
            json={
                "timestamp": t,
                "rul_nominal_cycles": 150.0 - i,
                "confidence_percent": 85.0,
                "mission_reliability_score": 90.0 - i,
            },
        )

    # History with limit 2
    res_hist = client.get(f"/api/engines/{engine_id}/prognostics?limit=2")
    assert res_hist.status_code == 200
    history = res_hist.json()
    assert len(history) == 2
    # Newest first
    assert history[0]["rul_nominal_cycles"] == 147.0
    assert history[1]["rul_nominal_cycles"] == 148.0


def test_prognostics_validation_failures(client: TestClient):
    engine_id = create_demo_engine(client)

    # Negative RUL
    res1 = client.post(
        f"/api/engines/{engine_id}/prognostics",
        json={"rul_nominal_cycles": -10.0, "confidence_percent": 80.0, "mission_reliability_score": 80.0},
    )
    assert res1.status_code == 422

    # Confidence > 100
    res2 = client.post(
        f"/api/engines/{engine_id}/prognostics",
        json={"rul_nominal_cycles": 100.0, "confidence_percent": 110.0, "mission_reliability_score": 80.0},
    )
    assert res2.status_code == 422


def test_prognostics_engine_not_found(client: TestClient):
    payload = {
        "rul_nominal_cycles": 100.0,
        "confidence_percent": 80.0,
        "mission_reliability_score": 80.0,
    }
    assert client.post("/api/engines/9999/prognostics", json=payload).status_code == 404
    assert client.get("/api/engines/9999/prognostics/latest").status_code == 404
    assert client.get("/api/engines/9999/prognostics").status_code == 404


def test_what_if_simulation_actions(client: TestClient):
    engine_id = create_demo_engine(client)

    # Initial snapshot to establish baseline
    client.post(
        f"/api/engines/{engine_id}/prognostics",
        json={
            "rul_nominal_cycles": 100.0,
            "confidence_percent": 85.0,
            "mission_reliability_score": 80.0,
        },
    )

    # Action 1: REDUCE_LOAD_15
    res1 = client.post(
        f"/api/engines/{engine_id}/prognostics/what-if",
        json={"action": "REDUCE_LOAD_15"},
    )
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["action"] == "REDUCE_LOAD_15"
    assert d1["simulated_stress_reduction_percent"] == 24.0
    assert d1["simulated_projected_rul_cycles"] > d1["estimated_current_rul_cycles"]
    assert d1["simulated_projected_reliability"] > d1["estimated_current_reliability"]

    # Action 2: RETURN_TO_BASE
    res2 = client.post(
        f"/api/engines/{engine_id}/prognostics/what-if",
        json={"action": "RETURN_TO_BASE"},
    )
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["simulated_stress_reduction_percent"] == 38.0
    assert d2["simulated_projected_rul_cycles"] == 100.0


def test_what_if_simulation_distinguishes_observed_estimated_simulated(client: TestClient):
    engine_id = create_demo_engine(client)

    res = client.post(
        f"/api/engines/{engine_id}/prognostics/what-if",
        json={"action": "REDUCE_RPM_10"},
    )
    assert res.status_code == 200
    data = res.json()

    # 1. Observed values
    assert "observed_current_health" in data
    assert "observed_status" in data
    assert data["observed_current_health"] == 92.0
    assert data["observed_status"] == "NOMINAL"

    # 2. Estimated prognostic state
    assert "estimated_current_rul_cycles" in data
    assert "estimated_current_reliability" in data
    assert data["estimated_current_rul_cycles"] > 0

    # 3. Simulated what-if projections
    assert "simulated_projected_health" in data
    assert "simulated_projected_rul_cycles" in data
    assert "simulated_projected_reliability" in data
    assert "simulated_stress_reduction_percent" in data
    assert "simulated_projected_status" in data
    assert "recommendation_note" in data
    assert "disclaimer" in data
    assert "Simulation-based prototype what-if projection" in data["disclaimer"]
    assert "simulation_assumption_note" in data
    assert "prototype scenario factors" in data["simulation_assumption_note"]


def test_what_if_simulation_invalid_action(client: TestClient):
    engine_id = create_demo_engine(client)
    res = client.post(
        f"/api/engines/{engine_id}/prognostics/what-if",
        json={"action": "INVALID_ACTION_123"},
    )
    assert res.status_code == 422


def test_what_if_simulation_engine_not_found(client: TestClient):
    res = client.post(
        "/api/engines/9999/prognostics/what-if",
        json={"action": "REDUCE_LOAD_15"},
    )
    assert res.status_code == 404
