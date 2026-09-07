from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .engine import Engine


class MaintenanceRecord(SQLModel, table=True):
    __tablename__ = "maintenance_records"

    id: Optional[int] = Field(default=None, primary_key=True)
    engine_id: int = Field(foreign_key="engines.id", index=True)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True
    )

    urgency: str = Field(
        default="NONE",
        description="Advisory priority category: IMMEDIATE_REVIEW, PRIORITY_REVIEW, NEXT_SCHEDULED_INSPECTION, INFORMATIONAL, NONE"
    )
    prescribed_action: str = Field(description="Advisory engineering recommendation or ground turnaround action")
    action_type: str = Field(
        default="INSPECTION",
        description="INSPECTION, REPLACEMENT, RECALIBRATION, OVERHAUL, MAINTENANCE"
    )
    target_component: str = Field(
        default="NONE",
        description="Target component or subassembly"
    )
    status: str = Field(
        default="OPEN",
        description="OPEN, IN_PROGRESS, COMPLETED, DEFERRED"
    )
    technician_notes: Optional[str] = None
    completed_at: Optional[datetime] = None

    # Relationships
    engine: Optional["Engine"] = Relationship(back_populates="maintenance_records")
