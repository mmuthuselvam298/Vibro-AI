from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from ..database import get_session
from ..models.engine import Engine
from ..models.mission import Mission
from ..schemas.mission import MissionCreate, MissionRead, MissionUpdate

router = APIRouter(prefix="/missions", tags=["missions"])

VALID_MISSION_STATUSES = {"PLANNED", "ACTIVE", "COMPLETED", "ABORTED"}


@router.post("", response_model=MissionRead, status_code=status.HTTP_201_CREATED)
def create_mission(mission_data: MissionCreate, session: Session = Depends(get_session)):
    """
    Create a new mission sortie assigned to an engine.
    Validates that the referenced engine exists and that lifecycle status is valid.
    """
    # 1. Validate engine exists
    engine = session.get(Engine, mission_data.engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {mission_data.engine_id} does not exist",
        )

    # 2. Validate mission code
    clean_code = mission_data.mission_code.strip()
    if not clean_code:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="mission_code is required and cannot be empty",
        )

    # 3. Validate status
    norm_status = mission_data.status.upper().strip()
    if norm_status not in VALID_MISSION_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid mission status '{mission_data.status}'. Must be one of: {', '.join(sorted(VALID_MISSION_STATUSES))}",
        )

    mission = Mission(
        engine_id=mission_data.engine_id,
        mission_code=clean_code,
        profile_type=mission_data.profile_type,
        status=norm_status,
        planned_duration_seconds=mission_data.planned_duration_seconds,
        elapsed_seconds=mission_data.elapsed_seconds,
        start_time=mission_data.start_time,
        end_time=mission_data.end_time,
        notes=mission_data.notes,
    )

    session.add(mission)
    session.commit()
    session.refresh(mission)
    return mission


@router.get("", response_model=list[MissionRead])
def get_missions(
    engine_id: Optional[int] = Query(default=None, description="Filter missions by engine ID"),
    status: Optional[str] = Query(default=None, description="Filter by status: PLANNED, ACTIVE, COMPLETED, ABORTED"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_session),
):
    """Retrieve all missions with optional filtering by engine ID and status."""
    query = select(Mission)

    if engine_id is not None:
        query = query.where(Mission.engine_id == engine_id)

    if status:
        query = query.where(Mission.status == status.upper().strip())

    query = query.offset(skip).limit(limit)
    missions = session.exec(query).all()
    return missions


@router.get("/{mission_id}", response_model=MissionRead)
def get_mission(mission_id: int, session: Session = Depends(get_session)):
    """Retrieve a single mission by ID."""
    mission = session.get(Mission, mission_id)
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mission with ID {mission_id} not found",
        )
    return mission


@router.patch("/{mission_id}", response_model=MissionRead)
def update_mission(mission_id: int, update_data: MissionUpdate, session: Session = Depends(get_session)):
    """Update mission status, elapsed time, end time, or operational notes."""
    mission = session.get(Mission, mission_id)
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mission with ID {mission_id} not found",
        )

    if update_data.status is not None:
        norm_status = update_data.status.upper().strip()
        if norm_status not in VALID_MISSION_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid mission status '{update_data.status}'. Must be one of: {', '.join(sorted(VALID_MISSION_STATUSES))}",
            )
        mission.status = norm_status

    if update_data.profile_type is not None:
        mission.profile_type = update_data.profile_type

    if update_data.elapsed_seconds is not None:
        mission.elapsed_seconds = update_data.elapsed_seconds

    if update_data.start_time is not None:
        mission.start_time = update_data.start_time

    if update_data.end_time is not None:
        mission.end_time = update_data.end_time

    if update_data.notes is not None:
        mission.notes = update_data.notes

    session.add(mission)
    session.commit()
    session.refresh(mission)
    return mission
