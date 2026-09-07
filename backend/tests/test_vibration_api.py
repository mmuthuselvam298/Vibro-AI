import math
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


def create_demo_engine(client: TestClient, sn: str = "ENG-VIB-100") -> int:
    payload = {
        "uav_id": "UAV-VIB-01",
        "engine_model": "MALE-Piston-Demo",
        "serial_number": sn,
        "health_score": 95.0,
        "status": "NOMINAL",
    }
    res = client.post("/api/engines", json=payload)
    assert res.status_code == 201
    return res.json()["id"]


def create_demo_mission(client: TestClient, engine_id: int) -> int:
    payload = {
        "engine_id": engine_id,
        "mission_code": "MSN-VIB-01",
        "profile_type": "SURVEILLANCE",
        "planned_duration_seconds": 3600,
    }
    res = client.post("/api/missions", json=payload)
    assert res.status_code == 201
    return res.json()["id"]


def generate_synthetic_sine(freq_hz: float, amplitude: float = 2.0, num_samples: int = 512, fs: int = 1024) -> list[float]:
    """Generates deterministic synthetic sinusoidal waveform for signal testing."""
    return [
        round(amplitude * math.sin(2.0 * math.pi * freq_hz * (i / fs)), 4)
        for i in range(num_samples)
    ]


# =====================================================================
# Ingestion & Accurate Mathematical Feature Extraction Tests
# =====================================================================

def test_ingest_synthetic_signal_verifies_rms_and_dominant_frequency(client: TestClient):
    engine_id = create_demo_engine(client)

    # 60 Hz pure sinusoid, amplitude = 2.0 g, 512 samples at 1024 Hz
    amp = 2.0
    freq = 60.0
    fs = 1024
    samples = generate_synthetic_sine(freq_hz=freq, amplitude=amp, num_samples=512, fs=fs)

    payload = {
        "sampling_rate_hz": fs,
        "rpm": 3600.0,
        "axis": "Z",
        "samples": samples,
        "is_simulated": True,
    }

    res = client.post(f"/api/engines/{engine_id}/vibration/ingest", json=payload)
    assert res.status_code == 201
    data = res.json()

    burst = data["burst"]
    features = data["features"]
    meta = data["processing_metadata"]

    # 1. Burst verification
    assert burst["engine_id"] == engine_id
    assert burst["sampling_rate_hz"] == 1024
    assert burst["sample_count"] == 512
    assert burst["axis"] == "Z"
    assert burst["is_simulated"] is True
    assert burst["duration_ms"] == 500.0

    # 2. Time-domain mathematical verification:
    # Theoretical RMS of sine wave with amplitude A is A / sqrt(2) ≈ 2.0 / 1.4142 = 1.414 g
    expected_rms = amp / math.sqrt(2.0)
    assert abs(features["rms"] - expected_rms) < 0.05
    assert abs(features["peak"] - amp) < 0.05
    assert abs(features["peak_to_peak"] - (2 * amp)) < 0.1
    # Crest factor for pure sine wave is sqrt(2) ≈ 1.41
    assert abs(features["crest_factor"] - 1.41) < 0.15

    # 3. Frequency-domain verification:
    # Detected dominant frequency must be 60 Hz ± 2 Hz (df = 2.0 Hz)
    assert abs(features["dominant_frequency"] - 60.0) <= 2.0

    # 4. Engine-order verification:
    # At 3600 RPM, shaft frequency is 60 Hz, so 60 Hz corresponds to 1.0X harmonic order
    assert features["shaft_frequency_hz"] == 60.0
    assert abs(features["dominant_order"] - 1.0) < 0.05
    assert features["harmonic_energy_1x"] > 0

    # 5. Metadata and Frequency Sub-Bands
    assert meta["fft_size"] == 512
    assert meta["window_type"] == "Hann window"
    assert len(data["frequency_bands"]) == 8
    # 60 Hz falls in BAND-1 (0-64 Hz), which must be the dominant band
    assert data["frequency_bands"][0]["band"] == "BAND-1"
    assert data["frequency_bands"][0]["is_dominant"] is True


def test_ingest_multi_axis_acceleration_data(client: TestClient):
    engine_id = create_demo_engine(client)

    samples_z = generate_synthetic_sine(60.0, amplitude=1.5, num_samples=256)
    samples_x = generate_synthetic_sine(120.0, amplitude=0.8, num_samples=256)
    samples_y = generate_synthetic_sine(30.0, amplitude=0.5, num_samples=256)

    payload = {
        "sampling_rate_hz": 1024,
        "rpm": 3600.0,
        "axis_data": {
            "Z": samples_z,
            "X": samples_x,
            "Y": samples_y,
        },
        "trigger_reason": "ANOMALY_TRIGGERED",
    }

    res = client.post(f"/api/engines/{engine_id}/vibration/ingest", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["burst"]["axis"] == "Z"
    assert data["burst"]["trigger_reason"] == "ANOMALY_TRIGGERED"
    assert set(data["processing_metadata"]["multi_axis_received"]) == {"X", "Y", "Z"}


def test_ingest_with_mission_validation(client: TestClient):
    eng1 = create_demo_engine(client, sn="ENG-VIB-SN1")
    eng2 = create_demo_engine(client, sn="ENG-VIB-SN2")
    m1 = create_demo_mission(client, eng1)

    samples = generate_synthetic_sine(60.0, num_samples=128)

    # Valid: mission belongs to eng1
    res_valid = client.post(
        f"/api/engines/{eng1}/vibration/ingest",
        json={"samples": samples, "mission_id": m1},
    )
    assert res_valid.status_code == 201
    assert res_valid.json()["burst"]["mission_id"] == m1

    # Invalid: mission belongs to eng1, but submitted under eng2
    res_mismatch = client.post(
        f"/api/engines/{eng2}/vibration/ingest",
        json={"samples": samples, "mission_id": m1},
    )
    assert res_mismatch.status_code == 400
    assert "belongs to engine" in res_mismatch.json()["detail"].lower()

    # Invalid: non-existent mission
    res_bad_msn = client.post(
        f"/api/engines/{eng1}/vibration/ingest",
        json={"samples": samples, "mission_id": 99999},
    )
    assert res_bad_msn.status_code == 404


# =====================================================================
# Retrieval Endpoints: Latest and History
# =====================================================================

def test_get_latest_vibration_burst_and_features(client: TestClient):
    engine_id = create_demo_engine(client)

    # Initially 404
    assert client.get(f"/api/engines/{engine_id}/vibration/latest").status_code == 404
    assert client.get(f"/api/engines/{engine_id}/vibration/features/latest").status_code == 404

    now = datetime.now(timezone.utc)
    t1 = (now - timedelta(minutes=5)).isoformat()
    t2 = now.isoformat()

    # First burst
    client.post(
        f"/api/engines/{engine_id}/vibration/ingest",
        json={"samples": generate_synthetic_sine(60.0, amplitude=1.0), "timestamp": t1},
    )

    # Second burst (higher amplitude)
    client.post(
        f"/api/engines/{engine_id}/vibration/ingest",
        json={"samples": generate_synthetic_sine(60.0, amplitude=3.0), "timestamp": t2},
    )

    # Latest burst
    latest_burst = client.get(f"/api/engines/{engine_id}/vibration/latest")
    assert latest_burst.status_code == 200
    assert latest_burst.json()["engine_id"] == engine_id

    # Latest feature (should reflect second burst's ~3.0 peak)
    latest_feat = client.get(f"/api/engines/{engine_id}/vibration/features/latest")
    assert latest_feat.status_code == 200
    assert abs(latest_feat.json()["peak"] - 3.0) < 0.1


def test_get_vibration_history_and_filtering(client: TestClient):
    engine_id = create_demo_engine(client)

    now = datetime.now(timezone.utc)
    for i in range(4):
        t = (now - timedelta(minutes=40 - (i * 10))).isoformat()
        client.post(
            f"/api/engines/{engine_id}/vibration/ingest",
            json={"samples": generate_synthetic_sine(60.0 + i * 10), "timestamp": t},
        )

    # Limit filter
    res_limit = client.get(f"/api/engines/{engine_id}/vibration/history?limit=2")
    assert res_limit.status_code == 200
    bursts = res_limit.json()
    assert len(bursts) == 2

    # Features history
    res_feat_hist = client.get(f"/api/engines/{engine_id}/vibration/features?limit=2")
    assert res_feat_hist.status_code == 200
    features = res_feat_hist.json()
    assert len(features) == 2


# =====================================================================
# Validation Failures and Edge Cases
# =====================================================================

def test_vibration_engine_not_found(client: TestClient):
    samples = generate_synthetic_sine(60.0)
    assert client.post("/api/engines/9999/vibration/ingest", json={"samples": samples}).status_code == 404
    assert client.get("/api/engines/9999/vibration/latest").status_code == 404
    assert client.get("/api/engines/9999/vibration/history").status_code == 404
    assert client.get("/api/engines/9999/vibration/features/latest").status_code == 404
    assert client.get("/api/engines/9999/vibration/features").status_code == 404


def test_vibration_validation_failures(client: TestClient):
    engine_id = create_demo_engine(client)

    # 1. Missing both samples and axis_data
    res1 = client.post(f"/api/engines/{engine_id}/vibration/ingest", json={})
    assert res1.status_code == 422

    # 2. Too few samples (< 16)
    res2 = client.post(f"/api/engines/{engine_id}/vibration/ingest", json={"samples": [1.0, 2.0, 3.0]})
    assert res2.status_code == 422

    # 3. Invalid sampling rate (< 100 Hz)
    res3 = client.post(
        f"/api/engines/{engine_id}/vibration/ingest",
        json={"samples": generate_synthetic_sine(60.0, num_samples=32), "sampling_rate_hz": 50},
    )
    assert res3.status_code == 422

    # 4. Inconsistent axis lengths in multi-axis data
    res4 = client.post(
        f"/api/engines/{engine_id}/vibration/ingest",
        json={
            "axis_data": {
                "Z": [0.1] * 64,
                "X": [0.2] * 32,  # Length mismatch: 32 vs 64
            }
        },
    )
    assert res4.status_code == 422
    assert "inconsistent axis lengths" in res4.json()["detail"][0]["msg"].lower()

    # 5. Invalid axis identifier
    res5 = client.post(
        f"/api/engines/{engine_id}/vibration/ingest",
        json={"samples": generate_synthetic_sine(60.0, num_samples=32), "axis": "INVALID_AXIS"},
    )
    assert res5.status_code == 422


def test_known_frequency_sinusoid_in_expected_spectral_band(client: TestClient):
    engine_id = create_demo_engine(client)

    # 150 Hz pure sinusoid, amplitude = 2.5 g
    # Bands at 1024 Hz fs with 8 bands:
    # BAND-1: 0-64 Hz
    # BAND-2: 64-128 Hz
    # BAND-3: 128-192 Hz -> 150 Hz must fall strictly into BAND-3
    samples = generate_synthetic_sine(freq_hz=150.0, amplitude=2.5, num_samples=512, fs=1024)

    payload = {
        "sampling_rate_hz": 1024,
        "rpm": 3600.0,
        "samples": samples,
    }

    res = client.post(f"/api/engines/{engine_id}/vibration/ingest", json=payload)
    assert res.status_code == 201
    data = res.json()

    # Dominant frequency is ~150 Hz
    assert abs(data["features"]["dominant_frequency"] - 150.0) <= 2.0

    # BAND-3 must have the highest energy and be marked is_dominant
    bands = data["frequency_bands"]
    band3 = next(b for b in bands if b["band"] == "BAND-3")
    assert band3["is_dominant"] is True

    # Candidate indicator must be qualified and non-diagnostic
    indicator = data["features"]["candidate_anomaly_indicator"]
    assert indicator is not None
    assert "candidate" in indicator.lower() or "requires corroboration" in indicator.lower()
