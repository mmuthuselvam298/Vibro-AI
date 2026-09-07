from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from ..database import get_session
from ..models.engine import Engine
from ..models.mission import Mission
from ..models.prognostics import PrognosticSnapshot
from ..schemas.prognostics import (
    PrognosticSnapshotCreate,
    PrognosticSnapshotRead,
    WhatIfEvaluationRequest,
    WhatIfEvaluationResponse,
)
from ..services.prognostics_service import (
    estimate_trend_rul,
    estimate_mission_reliability,
    evaluate_what_if_action,
)

router = APIRouter(tags=["prognostics"])


@router.post(
    "/engines/{engine_id}/prognostics",
    response_model=PrognosticSnapshotRead,
    status_code=status.HTTP_201_CREATED,
)
def create_prognostic_snapshot(
    engine_id: int,
    snapshot_data: PrognosticSnapshotCreate,
    session: Session = Depends(get_session),
):
    """
    Record a prototype prognostic snapshot (RUL estimates and reliability margin) for an engine.
    """
    # 1. Validate engine exists
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    # 2. Validate mission if provided
    if snapshot_data.mission_id is not None:
        mission = session.get(Mission, snapshot_data.mission_id)
        if not mission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mission with ID {snapshot_data.mission_id} does not exist",
            )
        if mission.engine_id != engine_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mission {snapshot_data.mission_id} belongs to Engine {mission.engine_id}, not Engine {engine_id}",
            )

    rec_time = snapshot_data.timestamp or datetime.now(timezone.utc)

    snapshot = PrognosticSnapshot(
        engine_id=engine_id,
        mission_id=snapshot_data.mission_id,
        timestamp=rec_time,
        rul_nominal_cycles=snapshot_data.rul_nominal_cycles,
        rul_min_cycles=(
            snapshot_data.rul_min_cycles
            if snapshot_data.rul_min_cycles is not None
            else max(0, int(snapshot_data.rul_nominal_cycles * 0.85))
        ),
        rul_max_cycles=(
            snapshot_data.rul_max_cycles
            if snapshot_data.rul_max_cycles is not None
            else int(snapshot_data.rul_nominal_cycles * 1.15)
        ),
        confidence_percent=snapshot_data.confidence_percent,
        mission_reliability_score=snapshot_data.mission_reliability_score,
        mission_capability_status=snapshot_data.mission_capability_status,
        safe_operation_minutes=snapshot_data.safe_operation_minutes,
        margin_ratio=snapshot_data.margin_ratio,
        recommended_action=snapshot_data.recommended_action,
        primary_reason=snapshot_data.primary_reason,
    )

    session.add(snapshot)
    session.commit()
    session.refresh(snapshot)
    return snapshot


@router.get(
    "/engines/{engine_id}/prognostics/latest",
    response_model=PrognosticSnapshotRead,
)
def get_latest_prognostic_snapshot(
    engine_id: int,
    session: Session = Depends(get_session),
):
    """Retrieve the most recent prototype prognostic snapshot for an engine."""
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    snapshot = session.exec(
        select(PrognosticSnapshot)
        .where(PrognosticSnapshot.engine_id == engine_id)
        .order_by(PrognosticSnapshot.timestamp.desc())
    ).first()

    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No prognostic snapshots found for engine {engine_id}",
        )

    return snapshot


@router.get(
    "/engines/{engine_id}/prognostics",
    response_model=list[PrognosticSnapshotRead],
)
def get_prognostic_history(
    engine_id: int,
    limit: int = Query(default=50, ge=1, le=1000),
    session: Session = Depends(get_session),
):
    """Retrieve historical prognostic snapshots for an engine (newest first)."""
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    snapshots = session.exec(
        select(PrognosticSnapshot)
        .where(PrognosticSnapshot.engine_id == engine_id)
        .order_by(PrognosticSnapshot.timestamp.desc())
        .limit(limit)
    ).all()

    return snapshots


@router.post(
    "/engines/{engine_id}/prognostics/what-if",
    response_model=WhatIfEvaluationResponse,
)
def evaluate_what_if(
    engine_id: int,
    request: WhatIfEvaluationRequest,
    session: Session = Depends(get_session),
):
    """
    Run prototype What-If simulation evaluating how operational load adjustments
    affect projected degradation, stress reduction, and remaining useful life.
    
    IMPORTANT RESEARCH NOTICE:
    This endpoint computes simulation projections according to configured prototype
    simulation assumptions (not measured, physically guaranteed, or OEM-certified values).
    
    Clearly distinguishes:
    1. Observed/current health
    2. Estimated prognostic state
    3. Simulated what-if projection
    """
    # 1. Validate engine exists
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    observed_health = engine.health_score
    observed_status = engine.status

    # 2. Get latest snapshot for current baseline RUL / reliability
    latest_snapshot = session.exec(
        select(PrognosticSnapshot)
        .where(PrognosticSnapshot.engine_id == engine_id)
        .order_by(PrognosticSnapshot.timestamp.desc())
    ).first()

    if latest_snapshot:
        current_rul = latest_snapshot.rul_nominal_cycles
        current_reliability = latest_snapshot.mission_reliability_score
    else:
        # Calculate standard baseline estimate if no snapshot has been posted
        degradation_rate = request.optional_degradation_rate or 0.5
        rul_calc = estimate_trend_rul(observed_health, degradation_rate, observed_status)
        current_rul = rul_calc["rul_nominal_cycles"]
        rel_calc = estimate_mission_reliability(
            observed_health,
            current_rul,
            mission_total_seconds=float(request.assumed_mission_duration_seconds),
            severity=observed_status,
        )
        current_reliability = rel_calc["mission_reliability_score"]

    # 3. Compute what-if simulation
    sim_result = evaluate_what_if_action(
        action=request.action,
        current_health=observed_health,
        current_rul=current_rul,
        current_reliability=current_reliability,
        environmental_factor=request.environmental_factor,
    )

    return WhatIfEvaluationResponse(
        engine_id=engine_id,
        action=sim_result["action"],
        action_label=sim_result["action_label"],
        observed_current_health=observed_health,
        observed_status=observed_status,
        estimated_current_rul_cycles=current_rul,
        estimated_current_reliability=current_reliability,
        simulated_projected_health=sim_result["simulated_projected_health"],
        simulated_projected_rul_cycles=sim_result["simulated_projected_rul_cycles"],
        simulated_projected_reliability=sim_result["simulated_projected_reliability"],
        simulated_stress_reduction_percent=sim_result["simulated_stress_reduction_percent"],
        simulated_projected_status=sim_result["simulated_projected_status"],
        recommendation_note=sim_result["recommendation_note"],
    )
