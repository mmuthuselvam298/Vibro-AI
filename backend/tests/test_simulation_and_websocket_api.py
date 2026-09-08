"""
Integration Tests for Simulation REST Endpoints and WebSocket Streaming
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_simulation_get_state(client):
    res = client.get("/api/simulation/state?engine_id=1")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "frame" in data
    assert "diagnosis" in data
    assert data["frame"]["engine_id"] == 1
    assert "telemetry" in data["frame"]
    assert "vibration" in data["frame"]

def test_simulation_set_scenario_and_phase(client):
    # Set to EARLY_BEARING_WEAR
    res = client.post(
        "/api/simulation/scenario",
        json={"engine_id": 1, "scenario": "EARLY_BEARING_WEAR"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "scenario_updated"
    assert data["scenario"] == "EARLY_BEARING_WEAR"
    assert "BEARING" in data["candidate_fault"]

    # Set phase to TAKEOFF
    res_phase = client.post(
        "/api/simulation/phase",
        json={"engine_id": 1, "phase": "TAKEOFF"},
    )
    assert res_phase.status_code == 200
    assert res_phase.json()["phase"] == "TAKEOFF"

def test_system_trace_endpoint(client):
    # Ensure bearing scenario
    client.post("/api/simulation/scenario", json={"engine_id": 1, "scenario": "EARLY_BEARING_WEAR"})

    res = client.get("/api/simulation/system-trace?engine_id=1")
    assert res.status_code == 200
    data = res.json()
    assert "trace" in data
    trace = data["trace"]
    assert len(trace) == 8

    stages = [step["stage"] for step in trace]
    assert stages == [
        "SENSOR",
        "DSP",
        "INTELLIGENCE",
        "HEALTH",
        "RUL",
        "DIGITAL_TWIN",
        "MISSION",
        "DECISION_SUPPORT",
    ]

def test_websocket_telemetry_streaming(client):
    with client.websocket_connect("/ws/telemetry?engine_id=1") as websocket:
        # Receive first streaming frame
        data = websocket.receive_json()
        assert data["type"] == "engine_state"
        assert data["engine_id"] == 1
        assert "telemetry" in data
        assert "vibration" in data
        assert "diagnosis" in data
        assert "system_trace" in data

        # Send command to switch scenario
        websocket.send_json({"action": "set_scenario", "scenario": "HEALTHY"})
        ack = websocket.receive_json()
        assert ack.get("type") in ("command_ack", "engine_state")

        # Send ping
        websocket.send_json({"action": "ping"})
        # Might receive next telemetry frame or pong
        received = []
        for _ in range(5):
            msg = websocket.receive_json()
            received.append(msg.get("type"))
            if msg.get("type") == "pong":
                break

        assert "pong" in received or "engine_state" in received
