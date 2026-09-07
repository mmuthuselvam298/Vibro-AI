import math
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session
from app.models.digital_twin import DigitalTwinState
from app.services.telemetry_buffer import telemetry_buffer
from app.services.digital_twin_config import (
    DEFAULT_DIGITAL_TWIN_CONFIG,
    PrototypeDigitalTwinConfig,
    ThermalThresholds,
    TrajectoryConfig,
)
from app.services.digital_twin_service import compute_digital_twin_state


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
        test_client.test_engine = test_engine
        yield test_client
    app.dependency_overrides.clear()
    telemetry_buffer.reset()


def create_engine_record(client: TestClient, sn: str = "ENG-DT-01", is_simulated: bool = True) -> int:
    payload = {
        "uav_id": "UAV-ALPHA",
        "engine_model": "Generic-MALE-Piston",
        "serial_number": sn,
        "health_score": 96.0,
        "status": "NOMINAL",
        "is_simulated": is_simulated,
    }
    res = client.post("/api/engines", json=payload)
    assert res.status_code == 201
    return res.json()["id"]


def create_mission_record(client: TestClient, engine_id: int) -> int:
    payload = {
        "engine_id": engine_id,
        "mission_code": "MSN-DT-001",
        "profile_type": "SURVEILLANCE",
        "status": "ACTIVE",
        "planned_duration_seconds": 7200,
    }
    res = client.post("/api/missions", json=payload)
    assert res.status_code == 201
    return res.json()["id"]


def generate_sine_samples(freq_hz: float, amplitude: float = 1.8, count: int = 512, fs: int = 1024) -> list[float]:
    return [
        round(amplitude * math.sin(2.0 * math.pi * freq_hz * (i / fs)), 4)
        for i in range(count)
    ]


# =====================================================================
# 1. Engine Not Found
# =====================================================================
def test_digital_twin_engine_not_found(client: TestClient):
    res_get = client.get("/api/engines/99999/digital-twin")
    assert res_get.status_code == 404
    assert "does not exist" in res_get.json()["detail"]

    res_post = client.post("/api/engines/99999/digital-twin/refresh")
    assert res_post.status_code == 404
    assert "does not exist" in res_post.json()["detail"]

    res_hist = client.get("/api/engines/99999/digital-twin/history")
    assert res_hist.status_code == 404
    assert "does not exist" in res_hist.json()["detail"]


# =====================================================================
# 2. Digital Twin Generation With Only Engine Data
# =====================================================================
def test_digital_twin_generation_with_only_engine_data(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-ONLY")

    res = client.get(f"/api/engines/{eng_id}/digital-twin")
    assert res.status_code == 200
    data = res.json()

    assert data["engine_id"] == eng_id
    assert data["engine_serial_number"] == "ENG-DT-ONLY"
    assert data["overall_health_score"] == 96.0
    assert data["operational_status"] == "NOMINAL"
    assert data["state_source"] == "SIMULATED"

    # Subsystems check: uninstrumented or missing telemetry represented as UNAVAILABLE
    assert data["subsystems"]["MECHANICAL"]["status"] == "UNAVAILABLE"
    assert data["subsystems"]["THERMAL"]["status"] == "UNAVAILABLE"
    assert data["subsystems"]["LUBRICATION"]["status"] == "UNAVAILABLE"
    assert data["subsystems"]["COMBUSTION_FUEL"]["status"] == "UNAVAILABLE"
    assert data["subsystems"]["ELECTRICAL"]["status"] == "UNAVAILABLE"
    assert data["subsystems"]["OPERATING_CONTEXT"]["status"] == "NOMINAL"

    # Trajectory without health records
    assert data["health_trajectory"]["observation_count"] == 0
    assert data["health_trajectory"]["trend_direction"] == "UNKNOWN"

    # Freshness
    assert data["data_freshness"]["telemetry"]["status"] == "UNAVAILABLE"
    assert data["data_freshness"]["vibration"]["status"] == "UNAVAILABLE"
    assert data["data_freshness"]["health_history"]["status"] == "UNAVAILABLE"
    assert data["data_freshness"]["prognostics"]["status"] == "UNAVAILABLE"
    assert data["data_freshness"]["mission"]["status"] == "UNAVAILABLE"

    # Evidence
    assert len(data["evidence"]) > 0
    assert "disclaimer" in data


# =====================================================================
# 3. Digital Twin With Telemetry
# =====================================================================
def test_digital_twin_with_telemetry(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-TELEM")

    # Ingest telemetry with elevated CHT
    t_payload = {
        "engine_id": eng_id,
        "rpm": 5200.0,
        "oil_pressure": 4.2,
        "oil_temp": 92.0,
        "egt": 790.0,
        "cht": 188.0,  # elevated (> 180°C threshold -> MONITORING)
        "fuel_flow": 24.5,
        "vibration_rms": 0.82,
        "battery_voltage": 28.2,
        "injection_timing": 28.0,
    }
    t_res = client.post("/api/telemetry/ingest", json=t_payload)
    assert t_res.status_code == 200

    res = client.get(f"/api/engines/{eng_id}/digital-twin")
    assert res.status_code == 200
    data = res.json()

    assert data["data_freshness"]["telemetry"]["status"] == "AVAILABLE"
    assert data["subsystems"]["THERMAL"]["status"] == "MONITORING"
    assert data["subsystems"]["THERMAL"]["indicators"]["cht_c"] == 188.0
    assert data["subsystems"]["LUBRICATION"]["status"] == "NOMINAL"
    assert data["subsystems"]["COMBUSTION_FUEL"]["status"] == "NOMINAL"
    assert data["subsystems"]["ELECTRICAL"]["status"] == "NOMINAL"
    assert data["operational_status"] == "MONITORING"


# =====================================================================
# 4. Digital Twin With Vibration Features
# =====================================================================
def test_digital_twin_with_vibration_features(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-VIB")

    # Ingest vibration burst with elevated amplitude sine wave
    samples = generate_sine_samples(freq_hz=75.0, amplitude=2.2, count=512, fs=1024)
    v_payload = {
        "axis": "Z",
        "sampling_rate_hz": 1024,
        "rpm": 3600.0,
        "samples": samples,
        "is_simulated": True,
    }
    v_res = client.post(f"/api/engines/{eng_id}/vibration/ingest", json=v_payload)
    assert v_res.status_code == 201

    res = client.get(f"/api/engines/{eng_id}/digital-twin")
    assert res.status_code == 200
    data = res.json()

    assert data["data_freshness"]["vibration"]["status"] == "AVAILABLE"
    mech = data["subsystems"]["MECHANICAL"]
    assert mech["status"] in {"MONITORING", "ANOMALOUS", "DEGRADED"}
    assert mech["indicators"]["rms_g"] > 1.2
    assert abs(mech["indicators"]["dominant_frequency_hz"] - 75.0) <= 2.0


# =====================================================================
# 5. Digital Twin With Fault Events
# =====================================================================
def test_digital_twin_with_fault_events(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-FAULT")

    f_payload = {
        "fault_code": "LUB_002",
        "fault_title": "Low oil pressure under flight load",
        "affected_component": "OIL_SYSTEM",
        "severity": "HIGH",
        "confidence": 0.91,
    }
    f_res = client.post(f"/api/engines/{eng_id}/faults", json=f_payload)
    assert f_res.status_code == 201

    res = client.get(f"/api/engines/{eng_id}/digital-twin")
    assert res.status_code == 200
    data = res.json()

    assert len(data["active_faults"]) == 1
    assert data["active_faults"][0]["fault_code"] == "LUB_002"
    # HIGH severity fault sets overall operational status to DEGRADED
    assert data["operational_status"] == "DEGRADED"

    # Check evidence includes fault
    fault_evidence = [e for e in data["evidence"] if "LUB_002" in e]
    assert len(fault_evidence) > 0


# =====================================================================
# 6. Digital Twin With Health History
# =====================================================================
def test_digital_twin_with_health_history(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-HEALTH")

    now = datetime.now(timezone.utc)
    t1 = now - timedelta(hours=2)
    t2 = now - timedelta(hours=1)

    # First record: 95.0
    client.post(
        f"/api/engines/{eng_id}/health",
        json={
            "timestamp": t1.isoformat(),
            "health_score": 95.0,
            "operating_cycle": 10,
        },
    )

    # Second record: 91.5
    client.post(
        f"/api/engines/{eng_id}/health",
        json={
            "timestamp": t2.isoformat(),
            "health_score": 91.5,
            "operating_cycle": 11,
        },
    )

    res = client.get(f"/api/engines/{eng_id}/digital-twin")
    assert res.status_code == 200
    data = res.json()

    traj = data["health_trajectory"]
    assert traj["observation_count"] == 2
    assert traj["current_health"] == 91.5
    assert traj["previous_health"] == 95.0
    assert traj["trend_direction"] == "DEGRADING"
    assert traj["delta_health"] == -3.5
    assert data["overall_health_score"] == 91.5


# =====================================================================
# 7. Digital Twin With Prognostic Snapshot
# =====================================================================
def test_digital_twin_with_prognostic_snapshot(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-PROG")

    prog_payload = {
        "rul_nominal_cycles": 115,
        "rul_min_cycles": 90,
        "rul_max_cycles": 140,
        "confidence_percent": 84.0,
        "mission_reliability_score": 91.5,
        "mission_capability_status": "MISSION_CAPABLE",
        "safe_operation_minutes": 240,
    }
    p_res = client.post(f"/api/engines/{eng_id}/prognostics", json=prog_payload)
    assert p_res.status_code == 201

    res = client.get(f"/api/engines/{eng_id}/digital-twin")
    assert res.status_code == 200
    data = res.json()

    assert data["prognostics"] is not None
    assert data["prognostics"]["rul_nominal_cycles"] == 115
    assert data["prognostics"]["mission_capability_status"] == "MISSION_CAPABLE"
    assert data["data_freshness"]["prognostics"]["status"] == "AVAILABLE"


# =====================================================================
# 8. Digital Twin With Multiple Information Sources
# =====================================================================
def test_digital_twin_multiple_information_sources_fusion(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-MULTI")
    msn_id = create_mission_record(client, engine_id=eng_id)

    # Telemetry
    t_res = client.post(
        "/api/telemetry/ingest",
        json={
            "engine_id": eng_id,
            "mission_id": msn_id,
            "rpm": 5400.0,
            "oil_pressure": 4.5,
            "oil_temp": 94.0,
            "egt": 780.0,
            "cht": 172.0,
            "fuel_flow": 26.0,
            "vibration_rms": 0.88,
            "battery_voltage": 28.0,
            "injection_timing": 28.0,
        },
    )

    # Vibration burst
    samples = generate_sine_samples(freq_hz=50.0, amplitude=1.0, count=512, fs=1024)
    v_res = client.post(
        f"/api/engines/{eng_id}/vibration/ingest",
        json={
            "mission_id": msn_id,
            "axis": "Z",
            "sampling_rate_hz": 1024,
            "samples": samples,
        },
    )

    # Health record
    client.post(
        f"/api/engines/{eng_id}/health",
        json={"health_score": 94.0, "operating_cycle": 20},
    )

    # Prognostic snapshot
    client.post(
        f"/api/engines/{eng_id}/prognostics",
        json={
            "mission_id": msn_id,
            "rul_nominal_cycles": 140,
            "mission_capability_status": "MISSION_CAPABLE",
            "mission_reliability_score": 95.0,
            "safe_operation_minutes": 300,
            "confidence_percent": 88.0,
        },
    )

    res = client.get(f"/api/engines/{eng_id}/digital-twin")
    assert res.status_code == 200
    data = res.json()

    # All information streams successfully fused
    assert data["mission"] is not None
    assert data["mission"]["mission_code"] == "MSN-DT-001"
    assert data["data_freshness"]["telemetry"]["status"] == "AVAILABLE"
    assert data["data_freshness"]["vibration"]["status"] == "AVAILABLE"
    assert data["data_freshness"]["health_history"]["status"] == "AVAILABLE"
    assert data["data_freshness"]["prognostics"]["status"] == "AVAILABLE"
    assert data["data_freshness"]["mission"]["status"] == "AVAILABLE"

    assert data["subsystems"]["MECHANICAL"]["status"] == "NOMINAL"
    assert data["subsystems"]["THERMAL"]["status"] == "NOMINAL"
    assert data["subsystems"]["LUBRICATION"]["status"] == "NOMINAL"
    assert data["subsystems"]["COMBUSTION_FUEL"]["status"] == "NOMINAL"
    assert data["subsystems"]["ELECTRICAL"]["status"] == "NOMINAL"
    assert data["subsystems"]["OPERATING_CONTEXT"]["status"] == "NOMINAL"
    assert data["operational_status"] == "NOMINAL"


# =====================================================================
# 9. Missing Source Handling
# =====================================================================
def test_digital_twin_missing_source_handling(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-MISSING")

    # Ingest only telemetry; vibration, prognostics, and mission remain absent
    t_res = client.post(
        "/api/telemetry/ingest",
        json={
            "engine_id": eng_id,
            "rpm": 5000.0,
            "oil_pressure": 4.1,
            "oil_temp": 90.0,
            "egt": 760.0,
            "cht": 170.0,
            "fuel_flow": 22.0,
            "vibration_rms": 0.85,
        },
    )

    res = client.get(f"/api/engines/{eng_id}/digital-twin")
    assert res.status_code == 200
    data = res.json()

    # Telemetry is available
    assert data["data_freshness"]["telemetry"]["status"] == "AVAILABLE"
    # Vibration and prognostics are explicitly UNAVAILABLE without causing errors
    assert data["data_freshness"]["vibration"]["status"] == "UNAVAILABLE"
    assert data["data_freshness"]["prognostics"]["status"] == "UNAVAILABLE"
    assert data["prognostics"] is None


# =====================================================================
# 10. Stale / Unavailable Source Handling
# =====================================================================
def test_digital_twin_stale_source_handling(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-STALE")

    # Ingest telemetry timestamped 15 minutes ago (> 300s threshold)
    stale_time = datetime.now(timezone.utc) - timedelta(minutes=15)
    t_res = client.post(
        "/api/telemetry/ingest",
        json={
            "engine_id": eng_id,
            "timestamp": stale_time.isoformat(),
            "rpm": 5000.0,
            "oil_pressure": 4.0,
            "oil_temp": 90.0,
            "egt": 750.0,
            "cht": 165.0,
            "fuel_flow": 21.0,
            "vibration_rms": 0.80,
        },
    )

    res = client.get(f"/api/engines/{eng_id}/digital-twin")
    assert res.status_code == 200
    data = res.json()

    freshness = data["data_freshness"]["telemetry"]
    assert freshness["status"] == "STALE"
    assert freshness["age_seconds"] > 300.0
    assert any("STALE" in e for e in data["evidence"])


# =====================================================================
# 11. Health Trajectory Calculations
# =====================================================================
def test_digital_twin_health_trajectory(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-TRAJ")

    now = datetime.now(timezone.utc)
    t0 = now - timedelta(hours=3)
    t1 = now - timedelta(hours=2)
    t2 = now - timedelta(hours=1)

    # 3 health observations
    for t, score, cycle in [(t0, 98.0, 50), (t1, 95.0, 51), (t2, 90.0, 52)]:
        client.post(
            f"/api/engines/{eng_id}/health",
            json={"timestamp": t.isoformat(), "health_score": score, "operating_cycle": cycle},
        )

    res = client.get(f"/api/engines/{eng_id}/digital-twin")
    assert res.status_code == 200
    traj = res.json()["health_trajectory"]

    assert traj["observation_count"] == 3
    assert traj["current_health"] == 90.0
    assert traj["previous_health"] == 95.0
    assert traj["trend_direction"] == "DEGRADING"
    assert traj["delta_health"] == -5.0
    assert traj["degradation_rate_per_hour"] is not None
    assert traj["degradation_rate_per_hour"] > 0


# =====================================================================
# 12. Trend Classification
# =====================================================================
def test_digital_twin_trend_classification(client: TestClient):
    # Test STABLE within +/- 1.0% tolerance
    eng_id_stable = create_engine_record(client, sn="ENG-DT-STABLE")
    client.post(
        f"/api/engines/{eng_id_stable}/health",
        json={"health_score": 90.0, "operating_cycle": 10, "timestamp": "2026-09-08T00:00:00Z"},
    )
    client.post(
        f"/api/engines/{eng_id_stable}/health",
        json={"health_score": 90.5, "operating_cycle": 11, "timestamp": "2026-09-08T01:00:00Z"},
    )
    res_stable = client.get(f"/api/engines/{eng_id_stable}/digital-twin")
    assert res_stable.json()["health_trajectory"]["trend_direction"] == "STABLE"

    # Test IMPROVING (delta > +1.0%)
    eng_id_impr = create_engine_record(client, sn="ENG-DT-IMPR")
    client.post(
        f"/api/engines/{eng_id_impr}/health",
        json={"health_score": 85.0, "operating_cycle": 10, "timestamp": "2026-09-08T00:00:00Z"},
    )
    client.post(
        f"/api/engines/{eng_id_impr}/health",
        json={"health_score": 88.0, "operating_cycle": 11, "timestamp": "2026-09-08T01:00:00Z"},
    )
    res_impr = client.get(f"/api/engines/{eng_id_impr}/digital-twin")
    assert res_impr.json()["health_trajectory"]["trend_direction"] == "IMPROVING"


# =====================================================================
# 13. Simulation Traceability
# =====================================================================
def test_digital_twin_simulation_traceability(client: TestClient):
    # Case A: SIMULATED (engine simulated)
    eng_sim = create_engine_record(client, sn="ENG-TRACE-SIM", is_simulated=True)
    res_sim = client.get(f"/api/engines/{eng_sim}/digital-twin")
    assert res_sim.json()["state_source"] == "SIMULATED"

    # Case B: OBSERVED (engine observed)
    eng_obs = create_engine_record(client, sn="ENG-TRACE-OBS", is_simulated=False)
    res_obs = client.get(f"/api/engines/{eng_obs}/digital-twin")
    assert res_obs.json()["state_source"] == "OBSERVED"

    # Case C: MIXED (engine observed, but burst simulated)
    eng_mix = create_engine_record(client, sn="ENG-TRACE-MIX", is_simulated=False)
    samples = generate_sine_samples(freq_hz=40.0, amplitude=1.0, count=512, fs=1024)
    v_res = client.post(
        f"/api/engines/{eng_mix}/vibration/ingest",
        json={
            "axis": "Z",
            "sampling_rate_hz": 1024,
            "samples": samples,
            "is_simulated": True,  # simulated burst on observed engine
        },
    )
    assert v_res.status_code == 201
    res_mix = client.get(f"/api/engines/{eng_mix}/digital-twin")
    assert res_mix.json()["state_source"] == "MIXED"


# =====================================================================
# 14. Explainability / Evidence
# =====================================================================
def test_digital_twin_explainability_evidence(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-EVID")

    # Ingest telemetry with elevated oil temperature
    t_res = client.post(
        "/api/telemetry/ingest",
        json={
            "engine_id": eng_id,
            "rpm": 5000.0,
            "oil_pressure": 4.0,
            "oil_temp": 108.0,  # elevated oil temperature
            "egt": 750.0,
            "cht": 165.0,
            "fuel_flow": 21.0,
            "vibration_rms": 0.80,
        },
    )

    res = client.get(f"/api/engines/{eng_id}/digital-twin")
    evidence = res.json()["evidence"]

    assert any("Observed elevated oil temperature: 108.0°C" in e for e in evidence)
    # Confirm no unsupported claims or absolute certainties
    for item in evidence:
        assert "confirmed failure" not in item.lower()
        assert "proven bearing failure" not in item.lower()
        assert "guaranteed" not in item.lower()


# =====================================================================
# 15. Refresh Endpoint
# =====================================================================
def test_digital_twin_refresh_endpoint(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-REFRESH")

    res_refresh = client.post(f"/api/engines/{eng_id}/digital-twin/refresh")
    assert res_refresh.status_code == 200
    data = res_refresh.json()

    assert data["engine_id"] == eng_id
    assert data["operational_status"] == "NOMINAL"

    # Verify that a composite record was persisted
    res_hist = client.get(f"/api/engines/{eng_id}/digital-twin/history?subassembly=COMPOSITE_ENGINE")
    assert res_hist.status_code == 200
    hist = res_hist.json()
    assert len(hist) == 1
    assert hist[0]["subassembly"] == "COMPOSITE_ENGINE"
    assert hist[0]["operational_status"] == "NOMINAL"


# =====================================================================
# 16. History Endpoint
# =====================================================================
def test_digital_twin_history_endpoint(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-HIST")

    # Call refresh twice
    client.post(f"/api/engines/{eng_id}/digital-twin/refresh")
    client.post(f"/api/engines/{eng_id}/digital-twin/refresh")

    res = client.get(f"/api/engines/{eng_id}/digital-twin/history?limit=10")
    assert res.status_code == 200
    records = res.json()
    assert len(records) >= 1
    assert records[0]["engine_id"] == eng_id


# =====================================================================
# 17. Centralized Configuration Verification & Metadata Exposure
# =====================================================================
def test_digital_twin_centralized_config_and_metadata(client: TestClient):
    # Verify centralized configuration exists and contains all threshold categories
    cfg = DEFAULT_DIGITAL_TWIN_CONFIG
    assert cfg.profile_name == "PROTOTYPE_DEFAULT"
    assert cfg.classification_type == "CONFIGURABLE_PROTOTYPE_HEURISTICS"
    assert hasattr(cfg, "mechanical")
    assert hasattr(cfg, "thermal")
    assert hasattr(cfg, "lubrication")
    assert hasattr(cfg, "combustion_fuel")
    assert hasattr(cfg, "electrical")
    assert hasattr(cfg, "operating_context")
    assert hasattr(cfg, "freshness")
    assert hasattr(cfg, "trajectory")

    # Verify that API output exposes threshold profile metadata
    eng_id = create_engine_record(client, sn="ENG-DT-META")
    res = client.get(f"/api/engines/{eng_id}/digital-twin")
    assert res.status_code == 200
    data = res.json()

    assert "threshold_profile" in data
    profile = data["threshold_profile"]
    assert profile["profile_name"] == "PROTOTYPE_DEFAULT"
    assert profile["classification_type"] == "CONFIGURABLE_PROTOTYPE_HEURISTICS"
    assert "not an OEM-certified engine limit" in profile["description"]


# =====================================================================
# 18. Changing Prototype Threshold Deterministically Changes State
# =====================================================================
def test_digital_twin_custom_config_changes_classification_deterministically(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-CALIB")

    # Ingest telemetry with CHT = 185.0°C
    t_payload = {
        "engine_id": eng_id,
        "rpm": 5000.0,
        "oil_pressure": 4.5,
        "oil_temp": 90.0,
        "egt": 750.0,
        "cht": 185.0,  # 185°C
        "fuel_flow": 22.0,
        "vibration_rms": 0.85,
    }
    t_res = client.post("/api/telemetry/ingest", json=t_payload)
    assert t_res.status_code == 200

    # Case A: Default config (cht_monitoring_c = 180.0°C) -> 185°C triggers MONITORING
    res_default = client.get(f"/api/engines/{eng_id}/digital-twin")
    assert res_default.status_code == 200
    data_default = res_default.json()
    assert data_default["subsystems"]["THERMAL"]["status"] == "MONITORING"
    assert data_default["operational_status"] == "MONITORING"

    # Case B: Custom calibrated config with raised monitoring threshold (cht_monitoring_c = 190.0°C)
    custom_cfg = PrototypeDigitalTwinConfig(
        profile_name="HIGH_TEMPERATURE_TEST_BENCH",
        thermal=ThermalThresholds(cht_monitoring_c=190.0, cht_degraded_c=205.0),
    )

    # Get a direct DB session from the test engine to verify custom config behavior
    with Session(client.test_engine) as session:
        snapshot_custom = compute_digital_twin_state(
            engine_id=eng_id, session=session, config=custom_cfg
        )
        # Under custom threshold (190°C), CHT 185°C is within nominal bounds!
        assert snapshot_custom.subsystems["THERMAL"].status == "NOMINAL"
        assert snapshot_custom.operational_status == "NOMINAL"
        assert snapshot_custom.threshold_profile.profile_name == "HIGH_TEMPERATURE_TEST_BENCH"


# =====================================================================
# 19. Configurable Health Trend Tolerance Verification
# =====================================================================
def test_digital_twin_custom_trajectory_tolerance(client: TestClient):
    eng_id = create_engine_record(client, sn="ENG-DT-TOL")

    # Record 1: 90.0, Record 2: 89.2 -> delta = -0.8%
    client.post(
        f"/api/engines/{eng_id}/health",
        json={"health_score": 90.0, "operating_cycle": 10, "timestamp": "2026-09-08T00:00:00Z"},
    )
    client.post(
        f"/api/engines/{eng_id}/health",
        json={"health_score": 89.2, "operating_cycle": 11, "timestamp": "2026-09-08T01:00:00Z"},
    )

    # Under default tolerance 1.0%, delta -0.8% is within tolerance -> STABLE
    res_default = client.get(f"/api/engines/{eng_id}/digital-twin")
    assert res_default.json()["health_trajectory"]["trend_direction"] == "STABLE"

    # With tighter custom tolerance 0.5%, delta -0.8% exceeds threshold -> DEGRADING
    strict_cfg = PrototypeDigitalTwinConfig(
        trajectory=TrajectoryConfig(trend_tolerance_percent=0.5)
    )
    with Session(client.test_engine) as session:
        snapshot_strict = compute_digital_twin_state(
            engine_id=eng_id, session=session, config=strict_cfg
        )
        assert snapshot_strict.health_trajectory.trend_direction == "DEGRADING"

