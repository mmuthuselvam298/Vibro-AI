from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from ..database import get_session
from ..models.engine import Engine
from ..models.health import HealthRecord
from ..schemas.health import HealthRecordCreate, HealthRecordRead

router = APIRouter(tags=["health"])


@router.post(
    "/engines/{engine_id}/health",
    response_model=HealthRecordRead,
    status_code=status.HTTP_201_CREATED,
)
def create_health_record(
    engine_id: int,
    record_data: HealthRecordCreate,
    session: Session = Depends(get_session),
):
    """
    Record a prototype health checkpoint/score for an engine.
    Also updates the engine's current composite health_score.
    """
    # 1. Validate engine exists
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    rec_time = record_data.timestamp or datetime.now(timezone.utc)

    # 2. Create HealthRecord
    record = HealthRecord(
        engine_id=engine_id,
        timestamp=rec_time,
        operating_cycle=record_data.operating_cycle,
        health_score=record_data.health_score,
        degradation_rate_per_100c=record_data.degradation_rate_per_100c,
        upper_bound=record_data.upper_bound,
        lower_bound=record_data.lower_bound,
        is_simulated=record_data.is_simulated,
    )

    # 3. Update engine's active health score and timestamp
    engine.health_score = record_data.health_score
    engine.updated_at = rec_time

    session.add(record)
    session.add(engine)
    session.commit()
    session.refresh(record)

    return record


@router.get(
    "/engines/{engine_id}/health/latest",
    response_model=HealthRecordRead,
)
def get_latest_health_record(
    engine_id: int,
    session: Session = Depends(get_session),
):
    """Retrieve the most recent health record for an engine."""
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    record = session.exec(
        select(HealthRecord)
        .where(HealthRecord.engine_id == engine_id)
        .order_by(HealthRecord.timestamp.desc())
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No health records found for engine {engine_id}",
        )

    return record


@router.get(
    "/engines/{engine_id}/health",
    response_model=list[HealthRecordRead],
)
def get_health_history(
    engine_id: int,
    start_time: Optional[datetime] = Query(default=None, description="Filter records on or after timestamp"),
    end_time: Optional[datetime] = Query(default=None, description="Filter records on or before timestamp"),
    limit: int = Query(default=50, ge=1, le=1000, description="Max number of historical records to return"),
    session: Session = Depends(get_session),
):
    """
    Retrieve historical health records for an engine (chronological order, newest first).
    """
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    query = select(HealthRecord).where(HealthRecord.engine_id == engine_id)

    if start_time is not None:
        query = query.where(HealthRecord.timestamp >= start_time)

    if end_time is not None:
        query = query.where(HealthRecord.timestamp <= end_time)

    query = query.order_by(HealthRecord.timestamp.desc()).limit(limit)

    records = session.exec(query).all()
    return records
