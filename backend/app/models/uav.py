from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional, List
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .engine import Engine


class UAV(SQLModel, table=True):
    __tablename__ = "uavs"

    id: str = Field(primary_key=True, description="Unique UAV identifier, e.g. UAV-001")
    tail_number: str = Field(index=True, unique=True, description="Civil or military tail registration")
    model: str = Field(default="MALE-UAV-Demo", description="UAV platform airframe model")
    status: str = Field(default="STANDBY", description="Operational status: STANDBY, MISSION_ACTIVE, MAINTENANCE, GROUNDED")
    total_flight_hours: float = Field(default=0.0, ge=0.0, description="Cumulative airframe flight hours")

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    engines: List["Engine"] = Relationship(back_populates="uav")
