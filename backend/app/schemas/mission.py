from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class MissionCreate(BaseModel):
    engine_id: int = Field(description="ID of the engine assigned to this mission")
    mission_code: str = Field(min_length=1, description="Unique mission code, e.g. MSN-2026-0812")
    profile_type: str = Field(
        default="ENDURANCE_CRUISE",
        description="Profile: ENDURANCE_CRUISE, HIGH_ALTITUDE, HOT_WEATHER, RAPID_THROTTLE"
    )
    status: str = Field(
        default="PLANNED",
        description="Initial lifecycle status: PLANNED, ACTIVE, COMPLETED, ABORTED"
    )
    planned_duration_seconds: int = Field(default=7200, ge=0, description="Sortie duration in seconds")
    elapsed_seconds: float = Field(default=0.0, ge=0.0)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None


class MissionUpdate(BaseModel):
    status: Optional[str] = Field(
        default=None,
        description="Updated lifecycle status: PLANNED, ACTIVE, COMPLETED, ABORTED"
    )
    profile_type: Optional[str] = None
    elapsed_seconds: Optional[float] = Field(default=None, ge=0.0)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None


class MissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    engine_id: int
    mission_code: str
    profile_type: str
    status: str
    planned_duration_seconds: int
    elapsed_seconds: float
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
