import pytest
from datetime import datetime, timezone
from sqlmodel import SQLModel, create_engine, Session, select
from app.models import (
    UAV,
    Engine,
    Mission,
    TelemetryFrame,
    VibrationBurst,
    VibrationFeature,
    FaultEvent,
    HealthRecord,
    PrognosticSnapshot,
    MaintenanceRecord,
    DigitalTwinState,
)


@pytest.fixture(name="session")
def session_fixture():
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        yield session


def test_all_tables_registered():
    table_names = list(SQLModel.metadata.tables.keys())
    expected_tables = [
        "uavs",
        "engines",
        "missions",
        "telemetry_frames",
        "vibration_bursts",
        "vibration_features",
        "fault_events",
        "health_records",
        "prognostic_snapshots",
        "maintenance_records",
        "digital_twin_states",
    ]
    for table in expected_tables:
        assert table in table_names, f"Missing table registration: {table}"


def test_model_relationships_creation(session: Session):
    # 1. Create UAV
    uav = UAV(
        id="UAV-TEST-01",
        tail_number="VT-UAV-99",
        model="TAPAS-MALE-Demo",
        status="STANDBY",
        total_flight_hours=12.5,
    )
    session.add(uav)
    session.commit()
    session.refresh(uav)

    # 2. Create Engine attached to UAV
    engine = Engine(
        uav_id=uav.id,
        engine_model="MALE-Piston-Demo",
        serial_number="ENG-TEST-001",
        health_score=98.5,
        status="NOMINAL",
        total_runtime_hours=12.5,
        total_operating_cycles=25,
    )
    session.add(engine)
    session.commit()
    session.refresh(engine)

    assert engine.id is not None
    assert engine.uav.tail_number == "VT-UAV-99"
    assert len(uav.engines) == 1

    # 3. Create Mission
    mission = Mission(
        engine_id=engine.id,
        mission_code="MSN-TEST-101",
        profile_type="ENDURANCE_CRUISE",
        status="IN_PROGRESS",
        planned_duration_seconds=7200,
        elapsed_seconds=1200.0,
    )
    session.add(mission)
    session.commit()
    session.refresh(mission)

    assert mission.id is not None
    assert mission.engine.serial_number == "ENG-TEST-001"

    # 4. Create TelemetryFrame
    telemetry = TelemetryFrame(
        engine_id=engine.id,
        mission_id=mission.id,
        mission_time_seconds=1200.0,
        operating_cycle=25,
        rpm=3600.0,
        cht=152.0,
        egt=710.0,
        oil_pressure=4.6,
        oil_temp=88.0,
        fuel_flow=17.8,
        vibration_rms=0.85,
        expected_rpm=3600.0,
        expected_cht=152.0,
        status="NORMAL",
    )
    session.add(telemetry)

    # 5. Create VibrationBurst & Feature
    burst = VibrationBurst(
        engine_id=engine.id,
        mission_id=mission.id,
        sampling_rate_hz=1024,
        sample_count=512,
        axis="Z",
        raw_data_ref="bursts/2026/09/08/burst_001.bin",
    )
    session.add(burst)
    session.commit()
    session.refresh(burst)

    feature = VibrationFeature(
        burst_id=burst.id,
        rms=0.85,
        peak=1.25,
        peak_to_peak=2.45,
        crest_factor=1.47,
        kurtosis=3.02,
        dominant_frequency=60.0,
        spectral_energy=1240.0,
        harmonic_energy_1x=92.0,
    )
    session.add(feature)

    # 6. Create FaultEvent
    fault = FaultEvent(
        engine_id=engine.id,
        mission_id=mission.id,
        fault_code="EARLY_BEARING_WEAR",
        fault_title="Bearing Outer-Race Spalling (BPFO)",
        affected_component="BEARING",
        severity="MEDIUM",
        confidence=86.8,
        evidence_chain_json='["BPFO 150 Hz peak identified"]',
    )
    session.add(fault)

    # 7. Create HealthRecord
    health = HealthRecord(
        engine_id=engine.id,
        operating_cycle=25,
        health_score=98.5,
        degradation_rate_per_100c=0.12,
    )
    session.add(health)

    # 8. Create PrognosticSnapshot
    prognostic = PrognosticSnapshot(
        engine_id=engine.id,
        mission_id=mission.id,
        rul_nominal_cycles=185,
        rul_min_cycles=165,
        rul_max_cycles=205,
        confidence_percent=94.8,
        mission_reliability_score=96.5,
        recommended_action="CONTINUE_MISSION",
    )
    session.add(prognostic)

    # 9. Create MaintenanceRecord
    maintenance = MaintenanceRecord(
        engine_id=engine.id,
        urgency="NEXT_SCHEDULED_INSPECTION",
        prescribed_action="Routine turnaround inspection recommended according to authorized technical data.",
        action_type="INSPECTION",
        target_component="BEARING",
    )
    session.add(maintenance)

    # 10. Create DigitalTwinState
    twin = DigitalTwinState(
        engine_id=engine.id,
        subassembly="BEARING",
        health_score=98.0,
        wear_trend="STABLE",
        vibration_amplitude_g=0.85,
    )
    session.add(twin)

    session.commit()

    # Verify query and back-population
    stored_engine = session.get(Engine, engine.id)
    assert stored_engine is not None
    assert len(stored_engine.telemetry_frames) == 1
    assert len(stored_engine.vibration_bursts) == 1
    assert len(stored_engine.fault_events) == 1
    assert len(stored_engine.health_records) == 1
    assert len(stored_engine.prognostic_snapshots) == 1
    assert len(stored_engine.maintenance_records) == 1
    assert len(stored_engine.digital_twin_states) == 1
    assert stored_engine.vibration_bursts[0].feature.rms == 0.85
