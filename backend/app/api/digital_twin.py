from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, desc

from ..database import get_session
from ..models.engine import Engine
from ..models.digital_twin import DigitalTwinState
from ..schemas.digital_twin import (
    DigitalTwinSnapshotResponse,
    DigitalTwinStateRead,
)
from ..services.digital_twin_service import (
    EngineNotFoundError,
    compute_digital_twin_state,
    refresh_and_persist_digital_twin_state,
)

router = APIRouter(tags=["digital-twin"])


@router.get(
    "/engines/{engine_id}/digital-twin",
    response_model=DigitalTwinSnapshotResponse,
    summary="Get aggregated Digital Twin state snapshot",
)
def get_digital_twin_state(
    engine_id: int,
    session: Session = Depends(get_session),
):
    """
    Returns the current coherent Digital Twin condition snapshot for an engine.
    Aggregates telemetry, vibration features, active faults, health records,
    prognostics, and mission context into an explainable condition summary.
    """
    try:
        snapshot = compute_digital_twin_state(engine_id=engine_id, session=session)
        return snapshot
    except EngineNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )


@router.post(
    "/engines/{engine_id}/digital-twin/refresh",
    response_model=DigitalTwinSnapshotResponse,
    summary="Refresh and persist aggregated Digital Twin state",
)
def refresh_digital_twin_state(
    engine_id: int,
    session: Session = Depends(get_session),
):
    """
    Recomputes the aggregated Digital Twin state from currently available backend data,
    persists/updates the composite Digital Twin state record, and returns the snapshot.
    """
    try:
        snapshot, _ = refresh_and_persist_digital_twin_state(engine_id=engine_id, session=session)
        return snapshot
    except EngineNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )


@router.get(
    "/engines/{engine_id}/digital-twin/history",
    response_model=List[DigitalTwinStateRead],
    summary="Get persisted Digital Twin states history",
)
def get_digital_twin_history(
    engine_id: int,
    subassembly: Optional[str] = Query(
        default=None,
        description="Filter by subassembly (e.g. COMPOSITE_ENGINE, BEARING, PISTON, etc.)"
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=500,
        description="Maximum number of historical records to return"
    ),
    session: Session = Depends(get_session),
):
    """
    Returns previous persisted Digital Twin state records for the engine.
    """
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    query = select(DigitalTwinState).where(DigitalTwinState.engine_id == engine_id)
    if subassembly:
        query = query.where(DigitalTwinState.subassembly == subassembly)

    query = query.order_by(desc(DigitalTwinState.last_calculated)).limit(limit)
    records = session.exec(query).all()
    return records
