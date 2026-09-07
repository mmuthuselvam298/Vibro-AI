from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TelemetryIngest(BaseModel):
    engine_id: int = Field(description="Target engine identifier")
    mission_id: Optional[int] = Field(default=None, description="Optional associated active mission ID")

    timestamp: Optional[datetime] = Field(
        default=None,
        description="Frame observation timestamp (defaults to server UTC now if omitted)"
    )
    mission_time_seconds: float = Field(default=0.0, ge=0.0)
    operating_cycle: int = Field(default=0, ge=0)

    # Core 9-channel sensor measurements
    rpm: float = Field(description="Engine Speed in RPM")
    cht: float = Field(description="Cylinder Head Temperature in °C")
    egt: float = Field(description="Exhaust Gas Temperature in °C")
    oil_pressure: float = Field(description="Oil Hydrostatic Pressure in bar")
    oil_temp: float = Field(description="Oil Sump Temperature in °C")
    fuel_flow: float = Field(description="Fuel Flow Rate in L/h")
    vibration_rms: float = Field(description="Vibration RMS in g")
    battery_voltage: float = Field(default=28.0, description="Electrical bus voltage in V")
    injection_timing: float = Field(default=28.0, description="Injection timing in ° BTDC")

    # Physics Baseline (Expected Values)
    expected_rpm: Optional[float] = None
    expected_cht: Optional[float] = None
    expected_egt: Optional[float] = None
    expected_oil_pressure: Optional[float] = None
    expected_oil_temp: Optional[float] = None
    expected_fuel_flow: Optional[float] = None
    expected_vibration_rms: Optional[float] = None

    # Status / Residuals
    overall_deviation_score: Optional[float] = None
    status: str = Field(default="NORMAL", description="NORMAL, WATCH, ANOMALY, CRITICAL")

    # Extension Channels
    alternator_health: Optional[float] = None
    ambient_temp: Optional[float] = None
    altitude_ft: Optional[float] = None
    throttle_position: Optional[float] = None
    aux_pressure_bar: Optional[float] = None
    aux_temp_c: Optional[float] = None


class TelemetryIngestResponse(BaseModel):
    status: str = Field(description="'persisted' if written to SQLite, 'buffered_in_memory' if downsampled")
    persisted_to_db: bool
    engine_id: int
    timestamp: datetime
    frame_id: Optional[int] = None
    message: str


class TelemetryFrameRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int]
    engine_id: int
    mission_id: Optional[int]
    timestamp: datetime
    mission_time_seconds: float
    operating_cycle: int

    rpm: float
    cht: float
    egt: float
    oil_pressure: float
    oil_temp: float
    fuel_flow: float
    vibration_rms: float
    battery_voltage: float
    injection_timing: float

    expected_rpm: Optional[float]
    expected_cht: Optional[float]
    expected_egt: Optional[float]
    expected_oil_pressure: Optional[float]
    expected_oil_temp: Optional[float]
    expected_fuel_flow: Optional[float]
    expected_vibration_rms: Optional[float]

    overall_deviation_score: Optional[float]
    status: str

    alternator_health: Optional[float]
    ambient_temp: Optional[float]
    altitude_ft: Optional[float]
    throttle_position: Optional[float]
    aux_pressure_bar: Optional[float]
    aux_temp_c: Optional[float]
