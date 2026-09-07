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


def create_demo_engine(client: TestClient) -> int:
    payload = {
        "uav_id": "UAV-HEALTH-01",
        "engine_model": "MALE-Piston-Demo",
        "serial_number": "ENG-HEALTH-100",
        "health_score": 95.0,
        "status": "NOMINAL",
    }
    res = client.post("/api/engines", json=payload)
    assert res.status_code == 201
    return res.json()["id"]


def test_create_health_record_and_updates_engine_health(client: TestClient):
    engine_id = create_demo_engine(client)

    payload = {
        "operating_cycle": 12,
        "health_score": 88.5,
        "degradation_rate_per_100c": 1.25,
        "upper_bound": 91.0,
        "lower_bound": 86.0,
        "is_simulated": True,
    }
    res = client.post(f"/api/engines/{engine_id}/health", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["id"] is not None
    assert data["engine_id"] == engine_id
    assert data["operating_cycle"] == 12
    assert data["health_score"] == 88.5
    assert data["is_simulated"] is True

    # Verify engine composite health score was updated
    eng_res = client.get(f"/api/engines/{engine_id}")
    assert eng_res.status_code == 200
    assert eng_res.json()["health_score"] == 88.5


def test_get_latest_health_record(client: TestClient):
    engine_id = create_demo_engine(client)

    # Initially no records exist
    res_none = client.get(f"/api/engines/{engine_id}/health/latest")
    assert res_none.status_code == 404

    # Add older record
    now = datetime.now(timezone.utc)
    t1 = (now - timedelta(hours=2)).isoformat()
    t2 = (now - timedelta(hours=1)).isoformat()

    client.post(
        f"/api/engines/{engine_id}/health",
        json={"health_score": 92.0, "timestamp": t1, "operating_cycle": 10},
    )
    client.post(
        f"/api/engines/{engine_id}/health",
        json={"health_score": 89.0, "timestamp": t2, "operating_cycle": 11},
    )

    latest_res = client.get(f"/api/engines/{engine_id}/health/latest")
    assert latest_res.status_code == 200
    latest = latest_res.json()
    assert latest["health_score"] == 89.0
    assert latest["operating_cycle"] == 11


def test_get_health_history_with_filtering_and_limit(client: TestClient):
    engine_id = create_demo_engine(client)

    now = datetime.now(timezone.utc)
    # Insert 5 records spaced by 1 hour
    for i in range(5):
        t = (now - timedelta(hours=5 - i)).isoformat()
        client.post(
            f"/api/engines/{engine_id}/health",
            json={"health_score": 95.0 - i, "timestamp": t, "operating_cycle": 10 + i},
        )

    # Test limit
    res_limit = client.get(f"/api/engines/{engine_id}/health?limit=3")
    assert res_limit.status_code == 200
    records = res_limit.json()
    assert len(records) == 3
    # Check newest first order
    assert records[0]["health_score"] == 91.0
    assert records[1]["health_score"] == 92.0
    assert records[2]["health_score"] == 93.0

    # Test time filtering
    start_filter = (now - timedelta(hours=2, minutes=30)).isoformat()
    res_filtered = client.get(f"/api/engines/{engine_id}/health", params={"start_time": start_filter})
    assert res_filtered.status_code == 200
    filtered_records = res_filtered.json()
    # Expect records at hours -2, -1 (2 records)
    assert len(filtered_records) == 2


def test_health_record_engine_not_found(client: TestClient):
    payload = {"health_score": 90.0}
    res_post = client.post("/api/engines/9999/health", json=payload)
    assert res_post.status_code == 404

    res_latest = client.get("/api/engines/9999/health/latest")
    assert res_latest.status_code == 404

    res_hist = client.get("/api/engines/9999/health")
    assert res_hist.status_code == 404


def test_health_record_validation_failures(client: TestClient):
    engine_id = create_demo_engine(client)

    # Negative health score
    res1 = client.post(f"/api/engines/{engine_id}/health", json={"health_score": -5.0})
    assert res1.status_code == 422

    # Health score > 100
    res2 = client.post(f"/api/engines/{engine_id}/health", json={"health_score": 105.0})
    assert res2.status_code == 422

    # Negative degradation rate
    res3 = client.post(
        f"/api/engines/{engine_id}/health",
        json={"health_score": 85.0, "degradation_rate_per_100c": -1.0},
    )
    assert res3.status_code == 422
