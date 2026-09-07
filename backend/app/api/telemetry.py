from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from ..database import get_session
from ..models.engine import Engine
from ..models.mission import Mission
from ..models.telemetry import TelemetryFrame
from ..schemas.telemetry import TelemetryIngest, TelemetryIngestResponse, TelemetryFrameRead
from ..services.telemetry_buffer import telemetry_buffer

router = APIRouter(tags=["telemetry"])


@router.post("/telemetry/ingest", response_model=TelemetryIngestResponse, status_code=status.HTTP_200_OK)
def ingest_telemetry(
    data: TelemetryIngest,
    session: Session = Depends(get_session),
):
    """
    Ingest a telemetry frame from UAV avionics or frontend simulation.
    
    Validation:
    - Engine must exist.
    - If mission_id is provided, mission must exist and must belong to this engine.

    Sampling / Downsampling Strategy:
    - High-frequency frames (~20 Hz from simulation) immediately update the in-memory cache
      for zero-latency dashboard retrieval.
    - Only frames spaced by at least min_interval_seconds (default 2.0s) are written to SQLite,
      preventing lock contention and disk thrashing.
    """
    # 1. Validate engine exists
    engine = session.get(Engine, data.engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {data.engine_id} does not exist",
        )

    # 2. Validate mission if provided
    if data.mission_id is not None:
        mission = session.get(Mission, data.mission_id)
        if not mission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mission with ID {data.mission_id} does not exist",
            )
        if mission.engine_id != data.engine_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mission {data.mission_id} is assigned to Engine {mission.engine_id}, not Engine {data.engine_id}",
            )

    frame_timestamp = data.timestamp or datetime.now(timezone.utc)

    # 3. Instantiate model
    frame = TelemetryFrame(
        engine_id=data.engine_id,
        mission_id=data.mission_id,
        timestamp=frame_timestamp,
        mission_time_seconds=data.mission_time_seconds,
        operating_cycle=data.operating_cycle,
        rpm=data.rpm,
        cht=data.cht,
        egt=data.egt,
        oil_pressure=data.oil_pressure,
        oil_temp=data.oil_temp,
        fuel_flow=data.fuel_flow,
        vibration_rms=data.vibration_rms,
        battery_voltage=data.battery_voltage,
        injection_timing=data.injection_timing,
        expected_rpm=data.expected_rpm,
        expected_cht=data.expected_cht,
        expected_egt=data.expected_egt,
        expected_oil_pressure=data.expected_oil_pressure,
        expected_oil_temp=data.expected_oil_temp,
        expected_fuel_flow=data.expected_fuel_flow,
        expected_vibration_rms=data.expected_vibration_rms,
        overall_deviation_score=data.overall_deviation_score,
        status=data.status,
        alternator_health=data.alternator_health,
        ambient_temp=data.ambient_temp,
        altitude_ft=data.altitude_ft,
        throttle_position=data.throttle_position,
        aux_pressure_bar=data.aux_pressure_bar,
        aux_temp_c=data.aux_temp_c,
    )

    # 4. Always update in-memory cache for live readers
    telemetry_buffer.update_latest_memory(data.engine_id, frame)

    # 5. Check if sampling window permits persisting to SQLite
    if telemetry_buffer.should_persist(data.engine_id):
        session.add(frame)
        session.commit()
        session.refresh(frame)
        telemetry_buffer.record_persisted(data.engine_id)

        return TelemetryIngestResponse(
            status="persisted",
            persisted_to_db=True,
            engine_id=data.engine_id,
            timestamp=frame.timestamp,
            frame_id=frame.id,
            message="Telemetry frame successfully persisted to database",
        )

    # Buffered in memory only
    return TelemetryIngestResponse(
        status="buffered_in_memory",
        persisted_to_db=False,
        engine_id=data.engine_id,
        timestamp=frame.timestamp,
        frame_id=None,
        message=f"Telemetry frame held in real-time memory buffer (downsampled to protect SQLite; threshold: {telemetry_buffer.min_interval_seconds}s)",
    )


@router.get("/engines/{engine_id}/telemetry/latest", response_model=TelemetryFrameRead)
def get_latest_telemetry(engine_id: int, session: Session = Depends(get_session)):
    """
    Retrieve the most recent telemetry frame for an engine.
    Checks high-rate in-memory buffer first for sub-50ms live data, falling back to SQLite.
    """
    # 1. Validate engine exists
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    # 2. Check in-memory buffer first
    live_frame = telemetry_buffer.get_latest_memory(engine_id)
    if live_frame is not None:
        return live_frame

    # 3. Fallback to database
    db_frame = session.exec(
        select(TelemetryFrame)
        .where(TelemetryFrame.engine_id == engine_id)
        .order_by(TelemetryFrame.timestamp.desc())
    ).first()

    if not db_frame:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No telemetry recorded for engine {engine_id}",
        )

    return db_frame


@router.get("/engines/{engine_id}/telemetry/history", response_model=list[TelemetryFrameRead])
def get_telemetry_history(
    engine_id: int,
    start_time: Optional[datetime] = Query(default=None, description="Filter frames on or after this timestamp"),
    end_time: Optional[datetime] = Query(default=None, description="Filter frames on or before this timestamp"),
    limit: int = Query(default=50, ge=1, le=1000, description="Max number of historical frames to return"),
    session: Session = Depends(get_session),
):
    """
    Retrieve chronological telemetry history for charting and trend analysis.
    """
    # 1. Validate engine exists
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    query = select(TelemetryFrame).where(TelemetryFrame.engine_id == engine_id)

    if start_time is not None:
        query = query.where(TelemetryFrame.timestamp >= start_time)

    if end_time is not None:
        query = query.where(TelemetryFrame.timestamp <= end_time)

    # Chronological ordering for charts
    query = query.order_by(TelemetryFrame.timestamp.asc()).limit(limit)

    frames = session.exec(query).all()
    return frames
