from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .engine import Engine
    from .mission import Mission


class FaultEvent(SQLModel, table=True):
    __tablename__ = "fault_events"

    id: Optional[int] = Field(default=None, primary_key=True)
    engine_id: int = Field(foreign_key="engines.id", index=True)
    mission_id: Optional[int] = Field(default=None, foreign_key="missions.id", index=True)

    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True
    )

    fault_code: str = Field(
        index=True,
        description="Scenario/fault identifier (e.g. EARLY_BEARING_WEAR, PISTON_SLAP, SENSOR_DRIFT)"
    )
    fault_title: str = Field(description="Descriptive fault title")
    affected_component: str = Field(
        default="NONE",
        description="BEARING, PISTON, VALVE, ROLLING_ELEMENT, FUEL_INJECTOR, OIL_SYSTEM, COOLING_SYSTEM, SENSOR_ADXL, NONE"
    )
    severity: str = Field(
        default="NOMINAL",
        description="Severity: NOMINAL, LOW, MEDIUM, HIGH, CRITICAL"
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
        description="Diagnostic confidence percentage (0.0 to 100.0)"
    )
    evidence_consistency: str = Field(
        default="NORMAL_OPERATIONAL_VARIATION",
        description="MECHANICAL_FAULT_LIKELY, POSSIBLE_SENSOR_FAULT, NORMAL_OPERATIONAL_VARIATION"
    )
    evidence_chain_json: Optional[str] = Field(
        default=None,
        description="Serialized JSON array of explainable diagnostic rationale bullet points"
    )
    fusion_summary: Optional[str] = Field(
        default=None,
        description="One-sentence multi-sensor fusion synthesis"
    )

    is_acknowledged: bool = Field(default=False)
    resolved_at: Optional[datetime] = None

    # Relationships
    engine: Optional["Engine"] = Relationship(back_populates="fault_events")
    mission: Optional["Mission"] = Relationship(back_populates="fault_events")
