from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from ..database import get_session
from ..models.engine import Engine
from ..models.mission import Mission
from ..models.vibration import VibrationBurst, VibrationFeature
from ..schemas.vibration import (
    VibrationBurstIngest,
    VibrationBurstRead,
    VibrationFeatureRead,
    VibrationAnalysisResponse,
)
from ..services.vibration_service import (
    remove_dc_bias,
    apply_hann_window,
    pad_to_power_of_two,
    compute_magnitude_spectrum,
    extract_time_domain_features,
    extract_spectral_and_order_features,
    compute_frequency_band_energies,
    evaluate_candidate_indicators,
    vibration_buffer,
    CachedVibrationBurst,
)

router = APIRouter(tags=["vibration"])


@router.post(
    "/engines/{engine_id}/vibration/ingest",
    response_model=VibrationAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
def ingest_vibration_burst(
    engine_id: int,
    data: VibrationBurstIngest,
    session: Session = Depends(get_session),
):
    """
    Ingests a vibration burst, executes deterministic DSP analysis (windowing, FFT,
    order extraction, frequency-band energy decomposition), stores extracted features,
    and updates the in-memory real-time buffer.
    """
    # 1. Validate engine exists
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    # 2. Validate mission if provided
    if data.mission_id is not None:
        mission = session.get(Mission, data.mission_id)
        if not mission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mission with ID {data.mission_id} does not exist",
            )
        if mission.engine_id != engine_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mission {data.mission_id} belongs to Engine {mission.engine_id}, not Engine {engine_id}",
            )

    # 3. Resolve primary analysis samples and channel
    if data.axis_data:
        # Prefer Z axis if available in 3-axis accelerometer data, else first available
        if "Z" in data.axis_data:
            primary_axis = "Z"
        else:
            primary_axis = next(iter(data.axis_data.keys()))
        primary_samples = data.axis_data[primary_axis]
    else:
        primary_axis = data.axis or "Z"
        primary_samples = data.samples or []

    sample_count = len(primary_samples)
    duration_ms = round((sample_count / data.sampling_rate_hz) * 1000.0, 2)
    rec_time = data.timestamp or datetime.now(timezone.utc)

    # 4. RUN DETERMINISTIC DSP PIPELINE
    # Step A: Time-Domain Feature Extraction (on raw samples)
    time_features = extract_time_domain_features(primary_samples)

    # Step B: Preprocessing (DC offset removal)
    detrended = remove_dc_bias(primary_samples)

    # Step C: Pad to power of 2 for Radix-2 FFT
    padded = pad_to_power_of_two(detrended, min_size=512)

    # Step D: Windowing (Hann Window)
    windowed = apply_hann_window(padded)

    # Step E: Radix-2 FFT & Single-Sided Magnitude Spectrum
    spectrum, df = compute_magnitude_spectrum(windowed, data.sampling_rate_hz)

    # Step F: Spectral & Engine-Order Normalized Feature Extraction
    spectral_features = extract_spectral_and_order_features(spectrum, df, data.rpm)

    # Step G: Frequency-Band Energy Decomposition (8 Bands)
    frequency_bands, dominant_band = compute_frequency_band_energies(spectrum, data.sampling_rate_hz)

    # Step H: Decision-Support Candidate Indicator Evaluation
    candidate_indicator = evaluate_candidate_indicators(time_features, spectral_features, dominant_band)

    # 5. Persist VibrationBurst
    burst = VibrationBurst(
        engine_id=engine_id,
        mission_id=data.mission_id,
        timestamp=rec_time,
        sampling_rate_hz=data.sampling_rate_hz,
        sample_count=sample_count,
        duration_ms=duration_ms,
        axis=primary_axis,
        trigger_reason=data.trigger_reason,
        raw_data_ref=f"in-memory://engine-{engine_id}/burst-{rec_time.isoformat()}",
        rpm=data.rpm,
        is_simulated=data.is_simulated,
    )
    session.add(burst)
    session.commit()
    session.refresh(burst)

    # 6. Persist VibrationFeature
    feature = VibrationFeature(
        burst_id=burst.id,
        timestamp=rec_time,
        rms=time_features["rms"],
        peak=time_features["peak"],
        peak_to_peak=time_features["peak_to_peak"],
        crest_factor=time_features["crest_factor"],
        kurtosis=time_features["kurtosis"],
        skewness=time_features["skewness"],
        mean=time_features["mean"],
        std_dev=time_features["std_dev"],
        dominant_frequency=spectral_features["dominant_frequency"],
        spectral_energy=spectral_features["spectral_energy"],
        harmonic_energy_1x=spectral_features["harmonic_energy_1x"],
        harmonic_energy_2x=spectral_features["harmonic_energy_2x"],
        harmonic_energy_4x=spectral_features["harmonic_energy_4x"],
        bpfo_band_energy=spectral_features["bpfo_band_energy"],
        bsf_band_energy=spectral_features["bsf_band_energy"],
        high_freq_energy_ratio=spectral_features["high_freq_energy_ratio"],
        wpd_dominant_band=dominant_band,
        dominant_order=spectral_features["dominant_order"],
        shaft_frequency_hz=spectral_features["shaft_frequency_hz"],
        candidate_anomaly_indicator=candidate_indicator,
    )
    session.add(feature)
    session.commit()
    session.refresh(feature)

    # 7. Update In-Memory Cache for Real-Time Streaming
    spectrum_summary = spectrum[:128]  # Compact first 128 bins for visualization
    cached = CachedVibrationBurst(
        engine_id=engine_id,
        burst_id=burst.id,
        timestamp=rec_time.isoformat(),
        sampling_rate_hz=data.sampling_rate_hz,
        axis=primary_axis,
        rpm=data.rpm,
        time_features=time_features,
        spectral_features=spectral_features,
        frequency_bands=frequency_bands,
        spectrum_summary=spectrum_summary,
        candidate_indicator=candidate_indicator,
    )
    vibration_buffer.set_latest(engine_id, cached)

    # 8. Construct Response
    metadata = {
        "fft_size": len(padded),
        "frequency_resolution_hz": round(df, 2),
        "window_type": "Hann window",
        "processed_axis": primary_axis,
        "multi_axis_received": list(data.axis_data.keys()) if data.axis_data else [primary_axis],
        "processing_version": "v1.0.0-prototype",
        "order_tracking_active": data.rpm is not None,
    }

    return VibrationAnalysisResponse(
        burst=VibrationBurstRead.model_validate(burst),
        features=VibrationFeatureRead.model_validate(feature),
        frequency_bands=frequency_bands,
        wpd_bands=frequency_bands,
        spectrum_summary=spectrum_summary,
        processing_metadata=metadata,
    )


@router.get(
    "/engines/{engine_id}/vibration/latest",
    response_model=VibrationBurstRead,
)
def get_latest_vibration_burst(
    engine_id: int,
    session: Session = Depends(get_session),
):
    """Retrieve the most recent vibration burst recorded for an engine."""
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    burst = session.exec(
        select(VibrationBurst)
        .where(VibrationBurst.engine_id == engine_id)
        .order_by(VibrationBurst.timestamp.desc())
    ).first()

    if not burst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No vibration bursts found for engine {engine_id}",
        )

    return burst


@router.get(
    "/engines/{engine_id}/vibration/history",
    response_model=list[VibrationBurstRead],
)
def get_vibration_history(
    engine_id: int,
    axis: Optional[str] = Query(default=None, description="Filter by accelerometer axis (Z, X, Y)"),
    start_time: Optional[datetime] = Query(default=None, description="Filter bursts on or after timestamp"),
    end_time: Optional[datetime] = Query(default=None, description="Filter bursts on or before timestamp"),
    limit: int = Query(default=50, ge=1, le=1000, description="Max records to return"),
    session: Session = Depends(get_session),
):
    """Retrieve historical vibration bursts for an engine (newest first)."""
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    query = select(VibrationBurst).where(VibrationBurst.engine_id == engine_id)

    if axis:
        query = query.where(VibrationBurst.axis == axis.upper().strip())
    if start_time is not None:
        query = query.where(VibrationBurst.timestamp >= start_time)
    if end_time is not None:
        query = query.where(VibrationBurst.timestamp <= end_time)

    query = query.order_by(VibrationBurst.timestamp.desc()).limit(limit)
    return session.exec(query).all()


@router.get(
    "/engines/{engine_id}/vibration/features/latest",
    response_model=VibrationFeatureRead,
)
def get_latest_vibration_features(
    engine_id: int,
    session: Session = Depends(get_session),
):
    """Retrieve the most recent extracted vibration feature set for an engine."""
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    feature = session.exec(
        select(VibrationFeature)
        .join(VibrationBurst, VibrationFeature.burst_id == VibrationBurst.id)
        .where(VibrationBurst.engine_id == engine_id)
        .order_by(VibrationFeature.timestamp.desc())
    ).first()

    if not feature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No vibration features found for engine {engine_id}",
        )

    return feature


@router.get(
    "/engines/{engine_id}/vibration/features",
    response_model=list[VibrationFeatureRead],
)
def get_vibration_features_history(
    engine_id: int,
    start_time: Optional[datetime] = Query(default=None, description="Filter features on or after timestamp"),
    end_time: Optional[datetime] = Query(default=None, description="Filter features on or before timestamp"),
    limit: int = Query(default=50, ge=1, le=1000, description="Max feature records to return"),
    session: Session = Depends(get_session),
):
    """Retrieve historical extracted vibration features for trend analysis (newest first)."""
    engine = session.get(Engine, engine_id)
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Engine with ID {engine_id} does not exist",
        )

    query = (
        select(VibrationFeature)
        .join(VibrationBurst, VibrationFeature.burst_id == VibrationBurst.id)
        .where(VibrationBurst.engine_id == engine_id)
    )

    if start_time is not None:
        query = query.where(VibrationFeature.timestamp >= start_time)
    if end_time is not None:
        query = query.where(VibrationFeature.timestamp <= end_time)

    query = query.order_by(VibrationFeature.timestamp.desc()).limit(limit)
    return session.exec(query).all()
