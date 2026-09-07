from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .engine import Engine


class PrognosticSnapshot(SQLModel, table=True):
    __tablename__ = "prognostic_snapshots"

    id: Optional[int] = Field(default=None, primary_key=True)
    engine_id: int = Field(foreign_key="engines.id", index=True)
    mission_id: Optional[int] = Field(default=None, index=True)

    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True
    )

    # RUL Estimates (Cycles)
    rul_nominal_cycles: int = Field(description="Nominal remaining useful life in flight cycles (prototype estimate)")
    rul_min_cycles: int = Field(description="Lower prototype uncertainty bound for estimated RUL in flight cycles")
    rul_max_cycles: int = Field(description="Upper prototype uncertainty bound for estimated RUL in flight cycles")
    confidence_percent: float = Field(default=0.0, description="Prototype confidence and quality indicator score percentage (0.0 to 100.0)")

    # Mission Reliability & Decision Support
    mission_reliability_score: float = Field(default=100.0, description="Mission Reliability percentage (0.0 to 100.0)")
    mission_capability_status: str = Field(
        default="MISSION_CAPABLE",
        description="MISSION_CAPABLE, ENHANCED_MONITORING, MISSION_AT_RISK, CRITICAL_ABORT"
    )
    safe_operation_minutes: int = Field(default=0, description="Prototype projected operating duration remaining in minutes")
    margin_ratio: float = Field(default=1.0, description="Ratio of projected safe duration to remaining mission duration based on configured prototype criteria")
    recommended_action: str = Field(
        default="CONTINUE_MISSION",
        description="CONTINUE_MISSION, CONTINUE_WITH_ENHANCED_MONITORING, REDUCE_ENGINE_LOAD_15, RETURN_TO_BASE, ABORT_IMMEDIATE_SAFETY"
    )
    primary_reason: str = Field(default="", description="Operator decision explanation")

    # Relationships
    engine: Optional["Engine"] = Relationship(back_populates="prognostic_snapshots")
