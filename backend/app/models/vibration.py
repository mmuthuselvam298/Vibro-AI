from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .engine import Engine
    from .mission import Mission


class VibrationBurst(SQLModel, table=True):
    __tablename__ = "vibration_bursts"

    id: Optional[int] = Field(default=None, primary_key=True)
    engine_id: int = Field(foreign_key="engines.id", index=True)
    mission_id: Optional[int] = Field(default=None, foreign_key="missions.id", index=True)

    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True
    )
    sampling_rate_hz: int = Field(default=1024, description="Sampling rate in Hz (e.g. 1024 Hz)")
    sample_count: int = Field(default=512, description="Number of samples in burst buffer (e.g. 512)")
    duration_ms: float = Field(default=500.0, description="Burst duration in milliseconds")
    axis: str = Field(default="Z", description="Accelerometer channel: Z, X, or Y")
    trigger_reason: str = Field(
        default="PERIODIC",
        description="Trigger type: PERIODIC, ANOMALY_TRIGGERED, OPERATOR_DEMAND"
    )
    raw_data_ref: Optional[str] = Field(
        default=None,
        description="URI, file path, or object storage key for raw float samples array"
    )
    rpm: Optional[float] = Field(
        default=None,
        description="Engine rotational speed in RPM at burst acquisition"
    )
    is_simulated: bool = Field(
        default=True,
        description="True if generated from simulation model or test bench"
    )

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    engine: Optional["Engine"] = Relationship(back_populates="vibration_bursts")
    mission: Optional["Mission"] = Relationship(back_populates="vibration_bursts")
    feature: Optional["VibrationFeature"] = Relationship(
        back_populates="burst",
        sa_relationship_kwargs={"uselist": False}
    )


class VibrationFeature(SQLModel, table=True):
    __tablename__ = "vibration_features"

    id: Optional[int] = Field(default=None, primary_key=True)
    burst_id: int = Field(foreign_key="vibration_bursts.id", index=True, unique=True)

    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True
    )

    # Time-Domain Moments & Features
    rms: float = Field(description="Root Mean Square vibration energy in g")
    peak: float = Field(description="Peak vibration amplitude in g")
    peak_to_peak: float = Field(description="Peak-to-Peak amplitude in g")
    crest_factor: float = Field(description="Crest Factor (peak / RMS)")
    kurtosis: float = Field(description="Kurtosis moment (3.0 = Gaussian baseline)")
    skewness: float = Field(default=0.0, description="Skewness moment")
    mean: float = Field(default=0.0)
    std_dev: float = Field(default=0.0)

    # Spectral & Kinematic Harmonic Features (derived from FFT)
    dominant_frequency: float = Field(description="Dominant spectral peak in Hz")
    spectral_energy: float = Field(description="Total spectral energy")
    harmonic_energy_1x: float = Field(default=0.0, description="Fundamental rotational harmonic indicator (1X)")
    harmonic_energy_2x: float = Field(default=0.0, description="Second-order harmonic indicator (2X; candidate mechanical signature requiring corroboration)")
    harmonic_energy_4x: float = Field(default=0.0, description="Fourth-order harmonic indicator (4X; candidate mechanical signature requiring corroboration)")
    bpfo_band_energy: float = Field(default=0.0, description="BPFO-candidate band energy (illustrative prototype factor pending bearing geometry)")
    bsf_band_energy: float = Field(default=0.0, description="BSF-candidate band energy (illustrative prototype factor pending bearing geometry)")
    high_freq_energy_ratio: float = Field(default=0.0, description="High-frequency broadband energy ratio (>250 Hz)")
    wpd_dominant_band: Optional[str] = Field(default=None, description="Dominant spectral sub-band identifier from frequency-band analysis")

    # Order Analysis & Decision-Support Candidate Indicators
    dominant_order: Optional[float] = Field(
        default=None,
        description="Dominant harmonic order normalized by shaft rotational speed (freq / (RPM/60))"
    )
    shaft_frequency_hz: Optional[float] = Field(
        default=None,
        description="Calculated shaft rotational fundamental frequency in Hz (RPM / 60)"
    )
    candidate_anomaly_indicator: Optional[str] = Field(
        default=None,
        description="Prototype decision-support candidate vibration signature (requires corroboration; not a confirmed diagnosis)"
    )

    # Relationships
    burst: Optional[VibrationBurst] = Relationship(back_populates="feature")
