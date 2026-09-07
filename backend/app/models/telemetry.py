from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .engine import Engine
    from .mission import Mission


class TelemetryFrame(SQLModel, table=True):
    __tablename__ = "telemetry_frames"

    id: Optional[int] = Field(default=None, primary_key=True)
    engine_id: int = Field(foreign_key="engines.id", index=True)
    mission_id: Optional[int] = Field(default=None, foreign_key="missions.id", index=True)

    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True
    )
    mission_time_seconds: float = Field(default=0.0, ge=0.0)
    operating_cycle: int = Field(default=0, ge=0)

    # Core 9-Channel Sensor Telemetry (matching frontend simulation)
    rpm: float = Field(description="Engine Speed in RPM")
    cht: float = Field(description="Cylinder Head Temperature in °C")
    egt: float = Field(description="Exhaust Gas Temperature in °C")
    oil_pressure: float = Field(description="Oil Hydrostatic Pressure in bar")
    oil_temp: float = Field(description="Oil Sump Temperature in °C")
    fuel_flow: float = Field(description="Fuel Flow Rate in L/h")
    vibration_rms: float = Field(description="Vibration RMS in g")
    battery_voltage: float = Field(default=28.0, description="Electrical bus voltage in V")
    injection_timing: float = Field(default=28.0, description="Injection timing in ° BTDC")

    # Physics Baseline (Expected Healthy Reference Values)
    expected_rpm: Optional[float] = None
    expected_cht: Optional[float] = None
    expected_egt: Optional[float] = None
    expected_oil_pressure: Optional[float] = None
    expected_oil_temp: Optional[float] = None
    expected_fuel_flow: Optional[float] = None
    expected_vibration_rms: Optional[float] = None

    # Deviation Assessment
    overall_deviation_score: Optional[float] = None
    status: str = Field(default="NORMAL", description="NORMAL, WATCH, ANOMALY, CRITICAL")

    # Future Extension Channels
    alternator_health: Optional[float] = None
    ambient_temp: Optional[float] = None
    altitude_ft: Optional[float] = None
    throttle_position: Optional[float] = None
    aux_pressure_bar: Optional[float] = None
    aux_temp_c: Optional[float] = None

    # Relationships
    engine: Optional["Engine"] = Relationship(back_populates="telemetry_frames")
    mission: Optional["Mission"] = Relationship(back_populates="telemetry_frames")
