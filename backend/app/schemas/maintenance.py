from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

VALID_URGENCIES = {
    "IMMEDIATE_REVIEW",
    "PRIORITY_REVIEW",
    "NEXT_SCHEDULED_INSPECTION",
    "INFORMATIONAL",
    "NONE",
}

VALID_ACTION_TYPES = {"INSPECTION", "REPLACEMENT", "RECALIBRATION", "OVERHAUL", "MAINTENANCE"}
VALID_STATUSES = {"OPEN", "IN_PROGRESS", "COMPLETED", "DEFERRED"}


class MaintenanceActionCreate(BaseModel):
    urgency: str = Field(
        default="NEXT_SCHEDULED_INSPECTION",
        description="Advisory priority: IMMEDIATE_REVIEW, PRIORITY_REVIEW, NEXT_SCHEDULED_INSPECTION, INFORMATIONAL, NONE"
    )
    prescribed_action: str = Field(min_length=1, description="Advisory action recommendation")
    action_type: str = Field(
        default="INSPECTION",
        description="INSPECTION, REPLACEMENT, RECALIBRATION, OVERHAUL, MAINTENANCE"
    )
    target_component: str = Field(
        default="NONE",
        description="Target component: BEARING, PISTON, VALVE, OIL_SYSTEM, FUEL_INJECTOR, SENSOR_ADXL, etc."
    )
    status: str = Field(
        default="OPEN",
        description="Status: OPEN, IN_PROGRESS, COMPLETED, DEFERRED"
    )
    technician_notes: Optional[str] = None
    completed_at: Optional[datetime] = None

    @field_validator("urgency")
    @classmethod
    def validate_urgency(cls, v: str) -> str:
        norm = v.upper().strip()
        # Normalization aliases for non-numeric priorities
        if norm == "NEXT_SCHEDULED":
            norm = "NEXT_SCHEDULED_INSPECTION"
        elif norm == "HIGH_PRIORITY":
            norm = "PRIORITY_REVIEW"
        elif norm in {"CRITICAL_REVIEW", "IMMEDIATE"}:
            norm = "IMMEDIATE_REVIEW"

        if norm not in VALID_URGENCIES:
            raise ValueError(f"Invalid urgency '{v}'. Must be one of: {', '.join(sorted(VALID_URGENCIES))}")
        return norm

    @field_validator("action_type")
    @classmethod
    def validate_action_type(cls, v: str) -> str:
        norm = v.upper().strip()
        if norm not in VALID_ACTION_TYPES:
            raise ValueError(f"Invalid action_type '{v}'. Must be one of: {', '.join(sorted(VALID_ACTION_TYPES))}")
        return norm

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        norm = v.upper().strip()
        if norm not in VALID_STATUSES:
            raise ValueError(f"Invalid status '{v}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}")
        return norm

    @field_validator("prescribed_action")
    @classmethod
    def validate_action_text(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("prescribed_action cannot be empty or whitespace only")
        return clean


class MaintenanceRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    engine_id: int
    created_at: datetime
    urgency: str
    prescribed_action: str
    action_type: str
    target_component: str
    status: str
    technician_notes: Optional[str]
    completed_at: Optional[datetime]


class MaintenanceAdvisoryResponse(BaseModel):
    engine_id: int
    target_component: str
    urgency: str
    prescribed_action: str
    action_type: str
    advisory_source: str = "RULE_BASED_HEURISTIC"
    evidence_summary: Optional[str] = None
    disclaimer: str = (
        "Prototype decision-support advisory heuristic only. "
        "Does not constitute flight clearance, airworthiness certification, "
        "or manufacturer-approved maintenance intervals. All maintenance actions "
        "must comply with authorized technical documentation."
    )
