from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

VALID_CAPABILITY_STATUSES = {
    "MISSION_CAPABLE",
    "ENHANCED_MONITORING",
    "MISSION_AT_RISK",
    "CRITICAL_ABORT",
    "CAPABLE",
}

VALID_WHAT_IF_ACTIONS = {
    "BASELINE",
    "REDUCE_LOAD_15",
    "REDUCE_RPM_10",
    "RETURN_TO_BASE",
}


class PrognosticSnapshotCreate(BaseModel):
    mission_id: Optional[int] = Field(default=None, description="Optional associated sortie ID")
    timestamp: Optional[datetime] = Field(
        default=None,
        description="Observation timestamp (defaults to server UTC now if omitted)"
    )

    rul_nominal_cycles: int = Field(ge=0, description="Prototype estimated RUL in flight cycles")
    rul_min_cycles: Optional[int] = Field(
        default=None,
        ge=0,
        description="Lower prototype uncertainty bound for estimated RUL in flight cycles (computed if omitted)"
    )
    rul_max_cycles: Optional[int] = Field(
        default=None,
        ge=0,
        description="Upper prototype uncertainty bound for estimated RUL in flight cycles (computed if omitted)"
    )
    confidence_percent: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
        description="Prototype confidence and quality indicator score percentage (0.0 to 100.0; illustrative prototype index, NOT a statistically validated probability)"
    )

    mission_reliability_score: float = Field(
        default=100.0,
        ge=0.0,
        le=100.0,
        description="Mission reliability margin index (0.0 to 100.0)"
    )
    mission_capability_status: str = Field(
        default="MISSION_CAPABLE",
        description="Status: MISSION_CAPABLE, ENHANCED_MONITORING, MISSION_AT_RISK, CRITICAL_ABORT"
    )
    safe_operation_minutes: int = Field(
        default=0,
        ge=0,
        description="Prototype projected operating duration remaining in minutes"
    )
    margin_ratio: float = Field(
        default=1.0,
        ge=0.0,
        description="Ratio of projected safe duration to remaining mission duration"
    )
    recommended_action: str = Field(
        default="CONTINUE_MISSION",
        description="Operational guidance: CONTINUE_MISSION, CONTINUE_WITH_ENHANCED_MONITORING, REDUCE_ENGINE_LOAD_15, RETURN_TO_BASE, ABORT_IMMEDIATE_SAFETY"
    )
    primary_reason: str = Field(default="", description="Explainable decision-support rationale")

    @field_validator("mission_capability_status")
    @classmethod
    def validate_capability_status(cls, v: str) -> str:
        norm = v.upper().strip()
        if norm == "CAPABLE":
            norm = "MISSION_CAPABLE"
        if norm not in VALID_CAPABILITY_STATUSES:
            raise ValueError(f"Invalid capability status '{v}'. Must be one of: {', '.join(sorted(VALID_CAPABILITY_STATUSES))}")
        return norm


class PrognosticSnapshotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    engine_id: int
    mission_id: Optional[int]
    timestamp: datetime

    rul_nominal_cycles: int
    rul_min_cycles: int
    rul_max_cycles: int
    confidence_percent: float

    mission_reliability_score: float
    mission_capability_status: str
    safe_operation_minutes: int
    margin_ratio: float
    recommended_action: str
    primary_reason: str


class WhatIfEvaluationRequest(BaseModel):
    action: str = Field(
        default="REDUCE_LOAD_15",
        description="Simulated operational load adjustment: BASELINE, REDUCE_LOAD_15, REDUCE_RPM_10, RETURN_TO_BASE"
    )
    assumed_mission_duration_seconds: int = Field(
        default=7200,
        ge=60,
        description="Assumed total sortie duration in seconds (default 7200s / 2 hours)"
    )
    environmental_factor: str = Field(
        default="STANDARD",
        description="Environmental envelope assumption: STANDARD, HOT_WEATHER, HIGH_ALTITUDE"
    )
    optional_degradation_rate: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Optional custom degradation rate assumption (% health loss per 100 cycles)"
    )

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        norm = v.upper().strip()
        if norm not in VALID_WHAT_IF_ACTIONS:
            raise ValueError(f"Invalid action '{v}'. Must be one of: {', '.join(sorted(VALID_WHAT_IF_ACTIONS))}")
        return norm


class WhatIfEvaluationResponse(BaseModel):
    engine_id: int
    action: str
    action_label: str

    # 1. Observed / Current Health
    observed_current_health: float
    observed_status: str

    # 2. Estimated Prognostic State
    estimated_current_rul_cycles: int
    estimated_current_reliability: float

    # 3. Simulated What-If Projections
    simulated_projected_health: float
    simulated_projected_rul_cycles: int
    simulated_projected_reliability: float
    simulated_stress_reduction_percent: float = Field(
        description="Configured prototype stress-reduction simulation assumption percentage for this scenario"
    )
    simulated_projected_status: str
    recommendation_note: str = Field(
        description="Decision-support explanation reflecting configured prototype simulation assumptions"
    )
    simulation_assumption_note: str = Field(
        default="Projected changes represent illustrative prototype scenario factors, not measured or physically guaranteed outcomes.",
        description="Clarification that results reflect configured prototype simulation assumptions",
    )

    disclaimer: str = (
        "Simulation-based prototype what-if projection for decision-support evaluation only. "
        "Results reflect configured prototype simulation assumptions and coefficients, "
        "not experimentally validated physical measurements or certified prognostic predictions."
    )
