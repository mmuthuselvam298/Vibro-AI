from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class HealthRecordCreate(BaseModel):
    timestamp: Optional[datetime] = Field(
        default=None,
        description="Observation timestamp (defaults to server UTC now if omitted)"
    )
    operating_cycle: int = Field(default=0, ge=0, description="Operating cycle count or relative milestone")
    health_score: float = Field(
        ge=0.0,
        le=100.0,
        description="Composite health score index (0.0 to 100.0)"
    )
    degradation_rate_per_100c: float = Field(
        default=0.0,
        ge=0.0,
        description="Estimated health loss rate percentage per 100 cycles"
    )
    upper_bound: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Upper prototype uncertainty bound"
    )
    lower_bound: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Lower prototype uncertainty bound"
    )
    is_simulated: bool = Field(
        default=True,
        description="Explicit flag distinguishing simulation/prototype data from logged ground runs"
    )

    @field_validator("health_score")
    @classmethod
    def validate_health_score(cls, v: float) -> float:
        if v < 0.0 or v > 100.0:
            raise ValueError("health_score must be between 0.0 and 100.0")
        return round(v, 2)


class HealthRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    engine_id: int
    timestamp: datetime
    operating_cycle: int
    health_score: float
    degradation_rate_per_100c: float
    upper_bound: Optional[float] = None
    lower_bound: Optional[float] = None
    is_simulated: bool
