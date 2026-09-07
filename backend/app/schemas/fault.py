import json
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator

VALID_SEVERITIES = {"NOMINAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"}


class FaultEventCreate(BaseModel):
    mission_id: Optional[int] = Field(default=None, description="Optional associated mission sortie ID")
    timestamp: Optional[datetime] = Field(
        default=None,
        description="Event observation timestamp (defaults to server UTC now if omitted)"
    )
    fault_code: str = Field(min_length=1, description="Standard fault code identifier (e.g. EARLY_BEARING_WEAR, PISTON_SLAP)")
    fault_title: str = Field(min_length=1, description="Human-readable descriptive fault title")
    affected_component: str = Field(
        default="NONE",
        description="Affected component: BEARING, PISTON, VALVE, ROLLING_ELEMENT, FUEL_INJECTOR, OIL_SYSTEM, COOLING_SYSTEM, SENSOR_ADXL, NONE"
    )
    severity: str = Field(
        default="NOMINAL",
        description="Severity: NOMINAL, LOW, MEDIUM, HIGH, CRITICAL"
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Diagnostic confidence in 0.0 to 1.0 range"
    )
    evidence_consistency: str = Field(
        default="NORMAL_OPERATIONAL_VARIATION",
        description="Consistency: MECHANICAL_FAULT_LIKELY, POSSIBLE_SENSOR_FAULT, NORMAL_OPERATIONAL_VARIATION"
    )
    evidence: Optional[List[str]] = Field(
        default=None,
        description="List of explainable evidence rationale points"
    )
    fusion_summary: Optional[str] = Field(
        default=None,
        description="One-sentence multi-sensor diagnostic fusion summary"
    )
    is_acknowledged: bool = Field(default=False)

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        norm = v.upper().strip()
        if norm not in VALID_SEVERITIES:
            raise ValueError(f"Invalid severity '{v}'. Must be one of: {', '.join(sorted(VALID_SEVERITIES))}")
        return norm

    @field_validator("fault_code", "fault_title")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Field cannot be empty or whitespace only")
        return clean


class FaultEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    engine_id: int
    mission_id: Optional[int]
    timestamp: datetime
    fault_code: str
    fault_title: str
    affected_component: str
    severity: str
    confidence: float
    evidence_consistency: str
    evidence_chain_json: Optional[str]
    evidence: Optional[List[str]] = None
    fusion_summary: Optional[str]
    is_acknowledged: bool
    resolved_at: Optional[datetime]

    @classmethod
    def from_orm_with_evidence(cls, obj) -> "FaultEventRead":
        data = cls.model_validate(obj)
        if obj.evidence_chain_json:
            try:
                data.evidence = json.loads(obj.evidence_chain_json)
            except Exception:
                data.evidence = [obj.evidence_chain_json]
        return data
