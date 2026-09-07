from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional, List
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .uav import UAV
    from .mission import Mission
    from .telemetry import TelemetryFrame
    from .fault import FaultEvent
    from .health import HealthRecord
    from .prognostics import PrognosticSnapshot
    from .maintenance import MaintenanceRecord
    from .vibration import VibrationBurst
    from .digital_twin import DigitalTwinState


class Engine(SQLModel, table=True):
    __tablename__ = "engines"

    id: Optional[int] = Field(default=None, primary_key=True)

    uav_id: Optional[str] = Field(default=None, foreign_key="uavs.id", index=True, description="Mounted UAV ID")
    engine_model: str = Field(default="MALE-Piston-Demo", description="Engine platform designation")
    serial_number: str = Field(index=True, description="Unique engine serial number")

    health_score: float = Field(default=100.0, ge=0.0, le=100.0, description="Overall health score (0.0 to 100.0)")
    status: str = Field(default="NOMINAL", description="Status: NOMINAL, WATCH, ANOMALY, CRITICAL, GROUNDED")
    total_runtime_hours: float = Field(default=0.0, ge=0.0, description="Cumulative engine operating hours")
    total_operating_cycles: int = Field(default=0, ge=0, description="Cumulative flight cycles")
    is_simulated: bool = Field(default=True, description="True if simulated engine")

    installation_date: Optional[datetime] = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    uav: Optional["UAV"] = Relationship(back_populates="engines")
    missions: List["Mission"] = Relationship(back_populates="engine")
    telemetry_frames: List["TelemetryFrame"] = Relationship(back_populates="engine")
    fault_events: List["FaultEvent"] = Relationship(back_populates="engine")
    health_records: List["HealthRecord"] = Relationship(back_populates="engine")
    prognostic_snapshots: List["PrognosticSnapshot"] = Relationship(back_populates="engine")
    maintenance_records: List["MaintenanceRecord"] = Relationship(back_populates="engine")
    vibration_bursts: List["VibrationBurst"] = Relationship(back_populates="engine")
    digital_twin_states: List["DigitalTwinState"] = Relationship(back_populates="engine")