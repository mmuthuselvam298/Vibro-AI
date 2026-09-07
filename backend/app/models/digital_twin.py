from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .engine import Engine


class DigitalTwinState(SQLModel, table=True):
    __tablename__ = "digital_twin_states"

    id: Optional[int] = Field(default=None, primary_key=True)
    engine_id: int = Field(foreign_key="engines.id", index=True)

    subassembly: str = Field(
        index=True,
        description="Subassembly: BEARING, PISTON, VALVE, OIL_SYSTEM, FUEL_INJECTOR, COOLING_SYSTEM, SENSOR_ADXL"
    )
    health_score: float = Field(default=100.0, ge=0.0, le=100.0)
    wear_trend: str = Field(default="STABLE", description="STABLE, SLOW_WEAR, ACCELERATING, CRITICAL")
    thermal_stress_level: float = Field(default=0.0, ge=0.0, le=1.0, description="Normalized thermal stress index (0.0 to 1.0)")
    vibration_amplitude_g: float = Field(default=0.85, ge=0.0, description="Local component vibration amplitude in g")

    last_calculated: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    operational_status: Optional[str] = Field(
        default="NOMINAL",
        description="Prototype operational condition: NOMINAL, MONITORING, ANOMALOUS, DEGRADED, CRITICAL"
    )
    state_source: Optional[str] = Field(
        default="SIMULATED",
        description="Data provenance: SIMULATED, OBSERVED, MIXED"
    )
    evidence_summary: Optional[str] = Field(
        default=None,
        description="Compact summary of active evidence and diagnostic indicators"
    )

    # Relationships
    engine: Optional["Engine"] = Relationship(back_populates="digital_twin_states")
