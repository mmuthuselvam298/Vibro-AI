from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional, List
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .engine import Engine
    from .telemetry import TelemetryFrame
    from .vibration import VibrationBurst
    from .fault import FaultEvent


class Mission(SQLModel, table=True):
    __tablename__ = "missions"

    id: Optional[int] = Field(default=None, primary_key=True)
    engine_id: int = Field(foreign_key="engines.id", index=True, description="Engine powering this mission sortie")
    mission_code: str = Field(index=True, description="Mission sort code, e.g. MSN-2026-0812")
    profile_type: str = Field(
        default="ENDURANCE_CRUISE",
        description="Profile envelope: ENDURANCE_CRUISE, HIGH_ALTITUDE, HOT_WEATHER, RAPID_THROTTLE"
    )
    status: str = Field(
        default="PLANNED",
        description="Mission lifecycle status: PLANNED, IN_PROGRESS, COMPLETED, ABORTED, RTB"
    )
    planned_duration_seconds: int = Field(default=7200, ge=0, description="Planned sortie duration in seconds")
    elapsed_seconds: float = Field(default=0.0, ge=0.0, description="Elapsed mission flight time in seconds")
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    engine: Optional["Engine"] = Relationship(back_populates="missions")
    telemetry_frames: List["TelemetryFrame"] = Relationship(back_populates="mission")
    vibration_bursts: List["VibrationBurst"] = Relationship(back_populates="mission")
    fault_events: List["FaultEvent"] = Relationship(back_populates="mission")
