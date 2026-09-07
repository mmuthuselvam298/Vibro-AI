from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

VALID_OPERATIONAL_STATUSES = {
    "NOMINAL",
    "MONITORING",
    "ANOMALOUS",
    "DEGRADED",
    "CRITICAL",
}

VALID_STATE_SOURCES = {
    "SIMULATED",
    "OBSERVED",
    "MIXED",
}

VALID_FRESHNESS_STATUSES = {
    "AVAILABLE",
    "STALE",
    "UNAVAILABLE",
}

VALID_TREND_DIRECTIONS = {
    "IMPROVING",
    "STABLE",
    "DEGRADING",
    "UNKNOWN",
}


class SourceFreshnessInfo(BaseModel):
    status: str = Field(
        description="Freshness condition: AVAILABLE, STALE, UNAVAILABLE"
    )
    last_timestamp: Optional[datetime] = Field(
        default=None,
        description="Timestamp of the most recent observation from this source"
    )
    age_seconds: Optional[float] = Field(
        default=None,
        description="Elapsed time in seconds since the most recent observation"
    )
    is_simulated: Optional[bool] = Field(
        default=None,
        description="Whether the latest observation is marked as simulated"
    )
    details: Optional[str] = Field(
        default=None,
        description="Contextual note regarding source availability"
    )


class DataFreshnessSummary(BaseModel):
    telemetry: SourceFreshnessInfo
    vibration: SourceFreshnessInfo
    faults: SourceFreshnessInfo
    health_history: SourceFreshnessInfo
    prognostics: SourceFreshnessInfo
    mission: SourceFreshnessInfo


class SubsystemHealthState(BaseModel):
    subsystem: str = Field(
        description="Subsystem name: MECHANICAL, THERMAL, LUBRICATION, COMBUSTION_FUEL, ELECTRICAL, OPERATING_CONTEXT"
    )
    status: str = Field(
        description="Estimated subsystem condition: NOMINAL, MONITORING, ANOMALOUS, DEGRADED, CRITICAL, UNAVAILABLE"
    )
    health_score: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Estimated subsystem health score (0-100) where available"
    )
    indicators: Dict[str, Any] = Field(
        default_factory=dict,
        description="Key observed or derived parameter values for this subsystem"
    )
    notes: Optional[str] = Field(
        default=None,
        description="Subsystem assessment summary or notes on missing data"
    )


class HealthTrajectory(BaseModel):
    current_health: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Current estimated engine health score (0-100)"
    )
    previous_health: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Previous estimated engine health score from prior record"
    )
    trend_direction: str = Field(
        default="UNKNOWN",
        description="Trajectory direction: IMPROVING, STABLE, DEGRADING, UNKNOWN"
    )
    delta_health: Optional[float] = Field(
        default=None,
        description="Absolute difference between current and previous health scores"
    )
    degradation_rate_per_hour: Optional[float] = Field(
        default=None,
        description="Estimated degradation rate in health points per elapsed hour where timestamps permit"
    )
    observation_count: int = Field(
        default=0,
        ge=0,
        description="Total number of health records evaluated in trajectory"
    )
    latest_observation_time: Optional[datetime] = Field(
        default=None,
        description="Timestamp of the most recent health record observation"
    )
    classification_rule: str = Field(
        default="Prototype tolerance: |delta| <= 1.0% health points classified as STABLE",
        description="Explicit prototype rule used to classify trend direction"
    )


class ActiveFaultSummary(BaseModel):
    id: int
    fault_code: str
    fault_title: str
    severity: str
    affected_component: Optional[str] = "NONE"
    timestamp: datetime
    confidence: Optional[float] = 0.0
    fusion_summary: Optional[str] = None
    is_acknowledged: bool = False


class PrognosticsContext(BaseModel):
    snapshot_id: Optional[int] = None
    timestamp: Optional[datetime] = None
    rul_nominal_cycles: int
    rul_min_cycles: Optional[int] = None
    rul_max_cycles: Optional[int] = None
    mission_capability_status: str
    mission_reliability_score: float
    safe_operation_minutes: int
    confidence_percent: float
    is_simulated: bool = True


class MissionContext(BaseModel):
    mission_id: Optional[int] = None
    mission_code: Optional[str] = None
    profile_type: Optional[str] = None
    status: Optional[str] = None
    planned_duration_seconds: Optional[int] = None
    elapsed_seconds: Optional[float] = None
    altitude_ft: Optional[float] = None


class ThresholdProfileMetadata(BaseModel):
    profile_name: str = Field(
        default="PROTOTYPE_DEFAULT",
        description="Threshold profile identifier"
    )
    classification_type: str = Field(
        default="CONFIGURABLE_PROTOTYPE_HEURISTICS",
        description="Configuration classification: prototype engineering heuristics, not OEM certified limits"
    )
    description: str = Field(
        default="Configurable prototype thresholds for research/decision-support demonstration; not an OEM-certified engine limit.",
        description="Boundary disclaimer"
    )


class DigitalTwinSnapshotResponse(BaseModel):
    engine_id: int
    engine_serial_number: str
    timestamp: datetime
    operational_status: str = Field(
        description="Prototype operational status: NOMINAL, MONITORING, ANOMALOUS, DEGRADED, CRITICAL"
    )
    overall_health_score: float = Field(
        ge=0.0,
        le=100.0,
        description="Current estimated aggregate health score (0-100)"
    )
    state_source: str = Field(
        description="Data provenance: SIMULATED, OBSERVED, MIXED"
    )
    subsystems: Dict[str, SubsystemHealthState] = Field(
        description="Fused subsystem health evaluations"
    )
    health_trajectory: HealthTrajectory = Field(
        description="Historical health trajectory and degradation trend"
    )
    data_freshness: DataFreshnessSummary = Field(
        description="Data availability and freshness per information stream"
    )
    active_faults: List[ActiveFaultSummary] = Field(
        default_factory=list,
        description="Currently active or unresolved fault events"
    )
    prognostics: Optional[PrognosticsContext] = Field(
        default=None,
        description="Latest prototype prognostic assessment if available"
    )
    mission: Optional[MissionContext] = Field(
        default=None,
        description="Active or associated mission context if available"
    )
    evidence: List[str] = Field(
        default_factory=list,
        description="Deterministic explainability evidence list referencing available data"
    )
    threshold_profile: ThresholdProfileMetadata = Field(
        default_factory=ThresholdProfileMetadata,
        description="Metadata documenting configurable prototype thresholds used for state estimation"
    )
    disclaimer: str = Field(
        default="Research/prototype Digital Twin demonstrator. Not a certified flight-clearance, airworthiness determination, or safety-of-flight prediction.",
        description="Safety and boundary notice"
    )


class DigitalTwinStateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    engine_id: int
    subassembly: str
    health_score: float
    wear_trend: str
    thermal_stress_level: float
    vibration_amplitude_g: float
    last_calculated: datetime
    operational_status: Optional[str] = None
    state_source: Optional[str] = None
    evidence_summary: Optional[str] = None
