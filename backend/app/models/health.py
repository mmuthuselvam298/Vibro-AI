from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .engine import Engine


class HealthRecord(SQLModel, table=True):
    __tablename__ = "health_records"

    id: Optional[int] = Field(default=None, primary_key=True)
    engine_id: int = Field(foreign_key="engines.id", index=True)

    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True
    )
    operating_cycle: int = Field(default=0, ge=0, description="Relative or absolute cycle checkpoint")
    health_score: float = Field(ge=0.0, le=100.0, description="Composite engine health score (0.0 to 100.0)")
    degradation_rate_per_100c: float = Field(default=0.0, description="Health loss rate percentage per 100 cycles")
    upper_bound: Optional[float] = Field(default=None, description="Upper confidence interval bound")
    lower_bound: Optional[float] = Field(default=None, description="Lower confidence interval bound")
    is_simulated: bool = Field(default=True, description="True if generated from simulation model")

    # Relationships
    engine: Optional["Engine"] = Relationship(back_populates="health_records")
