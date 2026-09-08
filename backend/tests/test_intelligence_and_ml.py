"""
Unit & Integration Tests for ML Inference, Intelligence, and Simulation Services
"""

import pytest
from app.services.ml_inference_service import get_ml_inference_service
from app.services.simulation_service import get_simulation_service
from app.services.intelligence_service import get_intelligence_service

def test_ml_model_loading():
    svc = get_ml_inference_service()
    assert svc.is_loaded is True
    assert len(svc.classes) == 6
    assert "HEALTHY" in svc.classes
    assert "BEARING_OUTER_RACE" in svc.classes
    assert "BEARING_INNER_RACE" in svc.classes
    assert "ROLLING_ELEMENT_DEFECT" in svc.classes
    assert "PISTON_SLAP" in svc.classes
    assert "VALVE_LASH" in svc.classes

def test_ml_inference_determinism_and_probabilities():
    svc = get_ml_inference_service()
    features = {fn: 1.0 for fn in svc.feature_names}

    pred1 = svc.predict(features)
    pred2 = svc.predict(features)

    # Determinism check
    assert pred1["fault_type"] == pred2["fault_type"]
    assert pred1["confidence"] == pred2["confidence"]

    # Probability validity
    prob_sum = sum(pred1["probabilities"].values())
    assert 0.99 <= prob_sum <= 1.01
    assert 0.0 <= pred1["confidence"] <= 1.0
    for c in svc.classes:
        assert c in pred1["probabilities"]

def test_simulation_service_generation():
    sim = get_simulation_service()
    sim.set_scenario(1, "EARLY_BEARING_WEAR")
    sim.set_mission_phase(1, "CRUISE")

    frame = sim.step(1, dt_seconds=0.1)

    assert frame["engine_id"] == 1
    assert frame["scenario"] == "EARLY_BEARING_WEAR"
    assert frame["mission_phase"] == "CRUISE"
    assert frame["data_source"] == "SIMULATED"
    assert "telemetry" in frame
    assert "vibration" in frame
    assert len(frame["vibration"]["samples"]) == 512
    assert frame["telemetry"]["rpm"] > 3000
    assert frame["telemetry"]["vibration_rms"] > 0

def test_intelligence_healthy_baseline():
    sim = get_simulation_service()
    intel = get_intelligence_service()

    sim.set_scenario(1, "HEALTHY")
    sim.set_mission_phase(1, "CRUISE")
    frame = sim.step(1, dt_seconds=0.1)

    diag = intel.analyze_frame(frame["telemetry"], frame["vibration"]["samples"])

    assert diag["severity"] == "NOMINAL"
    assert diag["health_score"] >= 95.0
    assert diag["rul_cycles"] >= 400
    assert diag["mission_risk"]["risk_level"] == "NOMINAL"
    assert "NOMINAL" in diag["candidate_fault"] or "HEALTHY" in diag["candidate_fault"]

def test_intelligence_bearing_outer_race_vertical_slice():
    sim = get_simulation_service()
    intel = get_intelligence_service()

    sim.set_scenario(1, "EARLY_BEARING_WEAR")
    sim.set_mission_phase(1, "CRUISE")
    frame = sim.step(1, dt_seconds=0.1)

    diag = intel.analyze_frame(frame["telemetry"], frame["vibration"]["samples"])

    assert diag["affected_component"] == "BEARING"
    assert diag["severity"] in ("MEDIUM", "HIGH")
    assert diag["health_score"] < 95.0
    assert diag["rul_cycles"] < 100
    assert len(diag["evidence"]["primary"]) + len(diag["evidence"]["supporting"]) >= 1
    assert "BEARING" in diag["candidate_fault"]
    # Evidence agreement reflects multi-source agreement
    assert diag["evidence_agreement"] in ("STRONG_AGREEMENT", "MODERATE_AGREEMENT")

def test_sensor_drift_isolation():
    sim = get_simulation_service()
    intel = get_intelligence_service()

    sim.set_scenario(1, "SENSOR_DRIFT")
    frame = sim.step(1, dt_seconds=0.1)

    diag = intel.analyze_frame(frame["telemetry"], frame["vibration"]["samples"])

    # Must NOT claim bearing failure when sensor drifts
    assert "BEARING" not in diag["candidate_fault"]
    assert diag["affected_component"] == "SENSOR_ADXL"
    assert diag["severity"] == "WATCH"
    assert diag["evidence_agreement"] == "SENSOR_INTEGRITY_ALERT"
    assert "No engine mechanical maintenance required" in diag["recommended_action"]

def test_mission_phase_risk_variation():
    intel = get_intelligence_service()

    cruise_risk = intel._evaluate_mission_risk(severity="HIGH", phase="CRUISE")
    takeoff_risk = intel._evaluate_mission_risk(severity="HIGH", phase="TAKEOFF")
    landing_risk = intel._evaluate_mission_risk(severity="HIGH", phase="LANDING")

    assert cruise_risk["risk_level"] == "ELEVATED_MISSION_RISK"
    assert takeoff_risk["risk_level"] == "CRITICAL_PHASE_RISK"
    assert landing_risk["risk_level"] == "HIGH_PHASE_RISK"
