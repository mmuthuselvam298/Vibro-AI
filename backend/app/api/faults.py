import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from ..database import get_session
from ..models.engine import Engine
from ..models.mission import Mission
from ..models.fault import FaultEvent
from ..schemas.fault import FaultEventCreate, FaultEventRead

router = APIRouter(tags=["faults"])


@router.post(
    "/engines/{engine_id}/faults",
    response_model=FaultEventRead,
    status_code=status.HTTP_201_CREATED,
)
def create_fault_event(
    engine_id: int,
    fault_data: FaultEventCreate,
    session: Session = Depends(get_session),
):
    """
    Record an explainable fault diagnostic event for a specified engine.
    
    Validation:
    - Engine must exist (404).
    - If mission_id is supplied, it must exist (404) and belong to this engine (400).
    - Severity must be one of: NOMINAL, LOW, MEDIUM, HIGH, CRITICAL.
    - Confidence must be within 0.0 to 1.0 range.
    """
    # 1. Validate engine exists
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    # 2. Validate mission if supplied
    if fault_data.mission_id is not None:
        mission = session.get(Mission, fault_data.mission_id)
        if not mission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mission with ID {fault_data.mission_id} does not exist",
            )
        if mission.engine_id != engine_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mission {fault_data.mission_id} is assigned to Engine {mission.engine_id}, not Engine {engine_id}",
            )

    event_time = fault_data.timestamp or datetime.now(timezone.utc)
    evidence_json = json.dumps(fault_data.evidence) if fault_data.evidence else None

    # 3. Create FaultEvent
    fault = FaultEvent(
        engine_id=engine_id,
        mission_id=fault_data.mission_id,
        timestamp=event_time,
        fault_code=fault_data.fault_code,
        fault_title=fault_data.fault_title,
        affected_component=fault_data.affected_component,
        severity=fault_data.severity,
        confidence=fault_data.confidence,
        evidence_consistency=fault_data.evidence_consistency,
        evidence_chain_json=evidence_json,
        fusion_summary=fault_data.fusion_summary,
        is_acknowledged=fault_data.is_acknowledged,
    )

    session.add(fault)
    session.commit()
    session.refresh(fault)

    return FaultEventRead.from_orm_with_evidence(fault)


@router.get(
    "/engines/{engine_id}/faults",
    response_model=list[FaultEventRead],
)
def get_fault_events(
    engine_id: int,
    severity: Optional[str] = Query(default=None, description="Filter by severity: NOMINAL, LOW, MEDIUM, HIGH, CRITICAL"),
    fault_code: Optional[str] = Query(default=None, description="Filter by specific fault code"),
    is_acknowledged: Optional[bool] = Query(default=None, description="Filter by acknowledgment status"),
    active_only: Optional[bool] = Query(default=None, description="If true, returns unresolved non-nominal faults"),
    start_time: Optional[datetime] = Query(default=None, description="Filter events on or after timestamp"),
    end_time: Optional[datetime] = Query(default=None, description="Filter events on or before timestamp"),
    limit: int = Query(default=50, ge=1, le=1000, description="Max number of events to return"),
    session: Session = Depends(get_session),
):
    """
    Retrieve chronological fault events for an engine (newest events first).
    Supports multi-attribute filtering.
    """
    # 1. Validate engine exists
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    query = select(FaultEvent).where(FaultEvent.engine_id == engine_id)

    if severity:
        query = query.where(FaultEvent.severity == severity.upper().strip())

    if fault_code:
        query = query.where(FaultEvent.fault_code == fault_code.strip())

    if is_acknowledged is not None:
        query = query.where(FaultEvent.is_acknowledged == is_acknowledged)

    if active_only:
        query = query.where(FaultEvent.resolved_at == None).where(FaultEvent.severity != "NOMINAL")

    if start_time is not None:
        query = query.where(FaultEvent.timestamp >= start_time)

    if end_time is not None:
        query = query.where(FaultEvent.timestamp <= end_time)

    # Newest events first
    query = query.order_by(FaultEvent.timestamp.desc()).limit(limit)

    results = session.exec(query).all()
    return [FaultEventRead.from_orm_with_evidence(f) for f in results]


@router.get(
    "/engines/{engine_id}/faults/{fault_id}",
    response_model=FaultEventRead,
)
def get_fault_event(
    engine_id: int,
    fault_id: int,
    session: Session = Depends(get_session),
):
    """Retrieve a single fault event by ID for a specific engine."""
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    fault = session.exec(
        select(FaultEvent)
        .where(FaultEvent.id == fault_id)
        .where(FaultEvent.engine_id == engine_id)
    ).first()

    if not fault:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fault event with ID {fault_id} not found for Engine {engine_id}",
        )

    return FaultEventRead.from_orm_with_evidence(fault)
