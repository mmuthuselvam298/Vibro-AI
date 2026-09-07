from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class Engine(SQLModel, table=True):
    __tablename__ = "engines"

    id: int | None = Field(default=None, primary_key=True)

    uav_id: str = Field(index=True)
    engine_model: str
    serial_number: str = Field(index=True)

    health_score: float = 100.0
    status: str = "NOMINAL"
    total_runtime_hours: float = 0.0

    installation_date: datetime | None = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )