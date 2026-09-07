import math
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


VALID_AXES = {"Z", "X", "Y", "TRI_AXIAL"}
VALID_TRIGGERS = {"PERIODIC", "ANOMALY_TRIGGERED", "OPERATOR_DEMAND", "CONTINUOUS"}


class VibrationBurstIngest(BaseModel):
    timestamp: Optional[datetime] = Field(
        default=None,
        description="Observation timestamp (defaults to server UTC now if omitted)"
    )
    sampling_rate_hz: int = Field(
        default=1024,
        ge=100,
        le=50000,
        description="Sampling frequency in Hz (e.g. 1024 Hz)"
    )
    rpm: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=15000.0,
        description="Engine rotational speed in RPM (e.g. 3600 RPM)"
    )
    mission_id: Optional[int] = Field(
        default=None,
        description="Optional associated sortie ID"
    )
    axis: str = Field(
        default="Z",
        description="Primary accelerometer axis: Z, X, Y, or TRI_AXIAL"
    )
    trigger_reason: str = Field(
        default="PERIODIC",
        description="Trigger classification: PERIODIC, ANOMALY_TRIGGERED, OPERATOR_DEMAND"
    )
    is_simulated: bool = Field(
        default=True,
        description="Flag distinguishing simulation test data from actual sensor telemetry"
    )

    # Ingestion supports single axis array OR multi-axis acceleration dictionary
    samples: Optional[List[float]] = Field(
        default=None,
        description="Single-channel acceleration sample array in g"
    )
    axis_data: Optional[Dict[str, List[float]]] = Field(
        default=None,
        description="Multi-axis acceleration sample arrays, e.g. {'z': [...], 'x': [...], 'y': [...]}"
    )

    @model_validator(mode="after")
    def validate_vibration_payload(self) -> "VibrationBurstIngest":
        # 1. Ensure at least one data source is provided
        if not self.samples and not self.axis_data:
            raise ValueError("Either 'samples' or 'axis_data' must be provided with acceleration measurements.")

        # 2. Validate multi-axis dictionary if provided
        if self.axis_data is not None:
            if not self.axis_data:
                raise ValueError("'axis_data' dictionary cannot be empty.")

            expected_len: Optional[int] = None
            norm_axis_data = {}
            for k, arr in self.axis_data.items():
                k_clean = k.upper().strip()
                if k_clean not in {"X", "Y", "Z"}:
                    raise ValueError(f"Invalid axis key '{k}' in axis_data. Must be X, Y, or Z.")
                if not arr or len(arr) < 16:
                    raise ValueError(f"Axis '{k}' must contain at least 16 samples, received {len(arr) if arr else 0}.")
                if expected_len is None:
                    expected_len = len(arr)
                elif len(arr) != expected_len:
                    raise ValueError(f"Inconsistent axis lengths: '{k}' has {len(arr)} samples, expected {expected_len}.")

                for idx, v in enumerate(arr):
                    if not math.isfinite(v):
                        raise ValueError(f"Invalid non-finite value in axis '{k}' at index {idx}.")
                norm_axis_data[k_clean] = arr

            self.axis_data = norm_axis_data

        # 3. Validate single-channel samples if provided
        if self.samples is not None:
            if len(self.samples) < 16:
                raise ValueError(f"'samples' must contain at least 16 samples, received {len(self.samples)}.")
            for idx, v in enumerate(self.samples):
                if not math.isfinite(v):
                    raise ValueError(f"Invalid non-finite value in samples at index {idx}.")

        # 4. Normalize axis string
        self.axis = self.axis.upper().strip()
        if self.axis not in VALID_AXES:
            raise ValueError(f"Invalid axis '{self.axis}'. Must be one of: {', '.join(sorted(VALID_AXES))}")

        # 5. Normalize trigger reason
        self.trigger_reason = self.trigger_reason.upper().strip()
        if self.trigger_reason not in VALID_TRIGGERS:
            raise ValueError(f"Invalid trigger_reason '{self.trigger_reason}'. Must be one of: {', '.join(sorted(VALID_TRIGGERS))}")

        return self


class VibrationBurstRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    engine_id: int
    mission_id: Optional[int]
    timestamp: datetime
    sampling_rate_hz: int
    sample_count: int
    duration_ms: float
    axis: str
    trigger_reason: str
    rpm: Optional[float]
    is_simulated: bool
    created_at: datetime


class VibrationFeatureRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    burst_id: int
    timestamp: datetime

    # Time-Domain Features
    rms: float
    peak: float
    peak_to_peak: float
    crest_factor: float
    kurtosis: float
    skewness: float
    mean: float
    std_dev: float

    # Spectral & Harmonic Features
    dominant_frequency: float
    spectral_energy: float
    harmonic_energy_1x: float = Field(description="Fundamental rotational harmonic indicator (1X)")
    harmonic_energy_2x: float = Field(description="Second-order harmonic indicator (2X; candidate mechanical signature)")
    harmonic_energy_4x: float = Field(description="Fourth-order harmonic indicator (4X; candidate mechanical signature)")
    bpfo_band_energy: float = Field(description="BPFO-candidate band energy (illustrative prototype factor pending bearing geometry)")
    bsf_band_energy: float = Field(description="BSF-candidate band energy (illustrative prototype factor pending bearing geometry)")
    high_freq_energy_ratio: float = Field(description="High-frequency broadband energy ratio (>250 Hz)")
    wpd_dominant_band: Optional[str] = Field(default=None, description="Dominant spectral sub-band identifier from frequency-band analysis")

    # Order Analysis & Candidate Indicators
    dominant_order: Optional[float] = Field(default=None, description="Dominant harmonic order normalized by shaft speed")
    shaft_frequency_hz: Optional[float] = Field(default=None, description="Fundamental shaft rotational frequency in Hz (RPM / 60)")
    candidate_anomaly_indicator: Optional[str] = Field(
        default=None,
        description="Prototype decision-support candidate vibration signature (requires corroboration; not a confirmed diagnosis)"
    )


class VibrationAnalysisResponse(BaseModel):
    burst: VibrationBurstRead
    features: VibrationFeatureRead
    frequency_bands: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="8-band uniform spectral sub-band energy decomposition"
    )
    wpd_bands: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Deprecated compatibility alias for frequency_bands"
    )
    spectrum_summary: Optional[List[Dict[str, Any]]] = None
    processing_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Metadata detailing signal windowing, FFT parameters, and prototype processing assumptions"
    )
