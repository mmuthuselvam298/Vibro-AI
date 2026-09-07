from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from ..database import get_session
from ..models.engine import Engine
from ..models.fault import FaultEvent
from ..models.maintenance import MaintenanceRecord
from ..schemas.maintenance import (
    MaintenanceActionCreate,
    MaintenanceRecordRead,
    MaintenanceAdvisoryResponse,
)
from ..services.maintenance_service import generate_rule_based_advisory

router = APIRouter(tags=["maintenance"])


@router.get(
    "/engines/{engine_id}/maintenance/advisories",
    response_model=list[MaintenanceAdvisoryResponse],
)
def get_maintenance_advisories(
    engine_id: int,
    session: Session = Depends(get_session),
):
    """
    Retrieve active rule-based maintenance advisories for an engine.
    
    Architecture & Design Separation:
    - Does NOT invent an AI diagnostic prediction.
    - Deterministically maps open/active FaultEvents into rule-based maintenance guidelines.
    - Also surfaces open maintenance work orders already logged for the engine.
    """
    # 1. Validate engine exists
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    advisories: list[MaintenanceAdvisoryResponse] = []

    # 2. Check active unresolved faults for this engine
    active_faults = session.exec(
        select(FaultEvent)
        .where(FaultEvent.engine_id == engine_id)
        .where(FaultEvent.resolved_at == None)
        .where(FaultEvent.severity != "NOMINAL")
        .order_by(FaultEvent.timestamp.desc())
    ).all()

    # Generate rule-based advisory for each unique affected component/fault
    seen_components = set()
    for fault in active_faults:
        comp_key = (fault.fault_code, fault.affected_component)
        if comp_key in seen_components:
            continue
        seen_components.add(comp_key)

        rule_data = generate_rule_based_advisory(
            fault_code=fault.fault_code,
            severity=fault.severity,
            affected_component=fault.affected_component,
            fusion_summary=fault.fusion_summary or "",
        )

        advisories.append(
            MaintenanceAdvisoryResponse(
                engine_id=engine_id,
                target_component=rule_data["target_component"],
                urgency=rule_data["urgency"],
                prescribed_action=rule_data["prescribed_action"],
                action_type=rule_data["action_type"],
                advisory_source="RULE_BASED_HEURISTIC",
                evidence_summary=rule_data["evidence_summary"],
            )
        )

    # 3. If no active faults, provide nominal baseline advisory
    if not advisories:
        advisories.append(
            MaintenanceAdvisoryResponse(
                engine_id=engine_id,
                target_component="GENERAL_POWERTRAIN",
                urgency="NONE",
                prescribed_action="No active fault-based maintenance advisory. Continue health monitoring.",
                action_type="INSPECTION",
                advisory_source="RULE_BASED_HEURISTIC",
                evidence_summary="All diagnostic streams nominal.",
            )
        )

    return advisories


@router.post(
    "/engines/{engine_id}/maintenance/actions",
    response_model=MaintenanceRecordRead,
    status_code=status.HTTP_201_CREATED,
)
def create_maintenance_action(
    engine_id: int,
    action_data: MaintenanceActionCreate,
    session: Session = Depends(get_session),
):
    """
    Log an official engineering or ground crew maintenance action for an engine.
    """
    # 1. Validate engine exists
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    record = MaintenanceRecord(
        engine_id=engine_id,
        created_at=datetime.now(timezone.utc),
        urgency=action_data.urgency,
        prescribed_action=action_data.prescribed_action,
        action_type=action_data.action_type,
        target_component=action_data.target_component,
        status=action_data.status,
        technician_notes=action_data.technician_notes,
        completed_at=action_data.completed_at,
    )

    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@router.get(
    "/engines/{engine_id}/maintenance",
    response_model=list[MaintenanceRecordRead],
)
def get_maintenance_history(
    engine_id: int,
    status_filter: Optional[str] = Query(default=None, alias="status", description="Filter by status: OPEN, IN_PROGRESS, COMPLETED, DEFERRED"),
    urgency: Optional[str] = Query(default=None, description="Filter by advisory priority: IMMEDIATE_REVIEW, PRIORITY_REVIEW, NEXT_SCHEDULED_INSPECTION, INFORMATIONAL, NONE"),
    limit: int = Query(default=50, ge=1, le=1000),
    session: Session = Depends(get_session),
):
    """
    Retrieve historical maintenance records and work orders for an engine (newest first).
    """
    # 1. Validate engine exists
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    query = select(MaintenanceRecord).where(MaintenanceRecord.engine_id == engine_id)

    if status_filter:
        query = query.where(MaintenanceRecord.status == status_filter.upper().strip())

    if urgency:
        query = query.where(MaintenanceRecord.urgency == urgency.upper().strip())

    query = query.order_by(MaintenanceRecord.created_at.desc()).limit(limit)

    records = session.exec(query).all()
    return records
