"""
End-to-End Vertical Slice Automated Test for SIH 2026

Validates complete authoritative server-owned propagation chain:
SERVER SCENARIO (EARLY_BEARING_WEAR)
  ↓
RAW VIBRATION SIGNAL GENERATION (512 samples @ 1024 Hz)
  ↓
REAL BACKEND DSP PIPELINE (Radix-2 FFT, Moments, BPFO Candidate Bands)
  ↓
FEATURE EXTRACTION (RMS, Peak, Kurtosis, Crest Factor, High-Freq Ratio)
  ↓
INTELLIGENCE & MULTI-EVIDENCE SYNTHESIS (Primary, Supporting, Conflicting)
  ↓
REAL MACHINE LEARNING INFERENCE (Random Forest Model)
  ↓
HEALTH DEGRADATION
  ↓
PROGNOSTIC RUL OPERATING MARGIN ESTIMATE
  ↓
MISSION-PHASE OPERATIONAL RISK
  ↓
DIGITAL TWIN SUBSYSTEM STATE MAPPING
  ↓
WEBSOCKET / REST STREAMING PAYLOAD
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.simulation_service import get_simulation_service
from app.services.intelligence_service import get_intelligence_service

@pytest.fixture
def client():
    return TestClient(app)

def test_complete_early_bearing_wear_vertical_slice_propagation(client):
    sim = get_simulation_service()
    intel = get_intelligence_service()

    # 1. Baseline Healthy check
    sim.set_scenario(1, "HEALTHY")
    sim.set_mission_phase(1, "CRUISE")
    healthy_frame = sim.step(1)
    healthy_diag = intel.analyze_frame(
        healthy_frame["telemetry"],
        healthy_frame["vibration"]["samples"],
    )

    assert healthy_diag["severity"] == "NOMINAL"
    assert healthy_diag["health_score"] >= 95.0
    healthy_rms = healthy_diag["dsp_metrics"]["rms"]
    healthy_kurtosis = healthy_diag["dsp_metrics"]["kurtosis"]

    # 2. Trigger SERVER-OWNED SCENARIO: EARLY_BEARING_WEAR
    res_post = client.post(
        "/api/simulation/scenario",
        json={"engine_id": 1, "scenario": "EARLY_BEARING_WEAR"},
    )
    assert res_post.status_code == 200
    post_data = res_post.json()
    assert post_data["scenario"] == "EARLY_BEARING_WEAR"

    # 3. Fetch current state via REST API
    res_state = client.get("/api/simulation/state?engine_id=1")
    assert res_state.status_code == 200
    state_data = res_state.json()

    frame = state_data["frame"]
    diag = state_data["diagnosis"]

    # 4. Assert Raw Vibration Signal & Telemetry Contract
    assert frame["data_source"] == "SIMULATED"
    assert frame["scenario"] == "EARLY_BEARING_WEAR"
    vibration = frame["vibration"]
    assert vibration["sampling_rate_hz"] == 1024
    assert len(vibration["samples"]) == 512
    assert "rpm" in frame["telemetry"]
    assert "oil_temp" in frame["telemetry"]
    assert "oil_pressure" in frame["telemetry"]

    # 5. Assert DSP feature changes from healthy baseline
    dsp = diag["dsp_metrics"]
    assert dsp["rms"] > healthy_rms, f"Vibration RMS must be elevated: {dsp['rms']} > {healthy_rms}"
    assert dsp["crest_factor"] > 1.7, f"Crest factor must reflect peak impulsiveness: {dsp['crest_factor']}"
    assert dsp["high_freq_energy_ratio"] > 0.15, "High frequency acoustic ratio must be elevated"

    # 6. Assert Intelligence & ML Model Prediction
    assert "BEARING" in diag["candidate_fault"]
    assert diag["affected_component"] == "BEARING"
    assert diag["severity"] in ("MEDIUM", "HIGH")
    assert diag["confidence"] > 0.60
    assert diag["evidence_agreement"] in ("STRONG_AGREEMENT", "MODERATE_AGREEMENT")
    assert len(diag["evidence"]["primary"]) >= 1
    assert len(diag["evidence"]["supporting"]) >= 1

    # 7. Assert Health Degradation & RUL Response
    assert diag["health_score"] < healthy_diag["health_score"]
    assert diag["rul_cycles"] < healthy_diag["rul_cycles"]
    assert diag["degradation_rate_per_100_cycles"] > healthy_diag["degradation_rate_per_100_cycles"]

    # 8. Assert Mission-Phase Risk & Decision Support
    mission_risk = diag["mission_risk"]
    assert mission_risk["phase"] == "CRUISE"
    assert mission_risk["risk_level"] in ("MODERATE_RISK", "ELEVATED_MISSION_RISK")
    assert len(diag["recommended_action"]) > 0

    # 9. Verify System Trace endpoint delivers all 8 stages
    res_trace = client.get("/api/simulation/system-trace?engine_id=1")
    assert res_trace.status_code == 200
    trace_data = res_trace.json()
    assert len(trace_data["trace"]) == 8
    trace_stages = [s["stage"] for s in trace_data["trace"]]
    assert trace_stages == [
        "SENSOR",
        "DSP",
        "INTELLIGENCE",
        "HEALTH",
        "RUL",
        "DIGITAL_TWIN",
        "MISSION",
        "DECISION_SUPPORT",
    ]

    # 10. Verify Live WebSocket Streaming delivers this complete engine state
    with client.websocket_connect("/ws/telemetry?engine_id=1") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "engine_state"
        assert msg["scenario"] == "EARLY_BEARING_WEAR"
        assert msg["diagnosis"]["affected_component"] == "BEARING"
        assert msg["system_trace"]["sensor"]["stage"] == "SENSOR"
        assert msg["system_trace"]["dsp"]["stage"] == "DSP"
        assert msg["system_trace"]["decision_support"]["stage"] == "DECISION_SUPPORT"
