from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models.engine import Engine

router = APIRouter(prefix="/engines", tags=["engines"])


@router.get("", response_model=list[Engine])
def get_engines(session: Session = Depends(get_session)):
    """Retrieve all engines registered in the fleet."""
    engines = session.exec(select(Engine)).all()
    return engines


@router.get("/{engine_id}", response_model=Engine)
def get_engine(engine_id: int, session: Session = Depends(get_session)):
    """Retrieve a single engine by its primary key ID."""
    engine_data = session.get(Engine, engine_id)

    if not engine_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} not found",
        )

    return engine_data


@router.post("", response_model=Engine, status_code=status.HTTP_201_CREATED)
def create_engine(engine_data: Engine, session: Session = Depends(get_session)):
    """
    Register a new engine in the fleet.
    Validates serial_number uniqueness and health score range.
    """
    # Validation
    clean_serial = engine_data.serial_number.strip() if engine_data.serial_number else ""
    if not clean_serial:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="serial_number is required and cannot be empty",
        )

    if engine_data.health_score < 0.0 or engine_data.health_score > 100.0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="health_score must be between 0.0 and 100.0",
        )

    # Safe uniqueness check to prevent duplicate test records
    existing = session.exec(
        select(Engine).where(Engine.serial_number == clean_serial)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Engine with serial number '{clean_serial}' already exists (ID: {existing.id})",
        )

    engine_data.serial_number = clean_serial
    session.add(engine_data)
    session.commit()
    session.refresh(engine_data)
    return engine_data
