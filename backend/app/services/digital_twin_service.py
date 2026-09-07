"""
Digital Twin State Aggregation & Health Trajectory Service

PROTOTYPE RESEARCH & DECISION-SUPPORT NOTICE:
--------------------------------------------
1. This service provides deterministic state aggregation and health trajectory synthesis
   for research and decision-support demonstration.
2. It combines observed telemetry, derived vibration features, active fault events,
   health records, and prototype prognostic estimates into a coherent condition summary.
3. It does NOT claim that the Digital Twin is a physically exact replica of the engine.
4. It does NOT constitute flight clearance, airworthiness certification, safe-to-fly decisions,
   grounding directives, or manufacturer-approved maintenance intervals.
5. All state classifications (NOMINAL, MONITORING, ANOMALOUS, DEGRADED, CRITICAL) are
   prototype decision-support condition labels, NOT regulatory or airworthiness designations.
6. Clearly distinguishes:
   - observed measurements
   - derived features
   - estimated health state
   - prototype prognostic estimate
   - simulated / what-if state
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlmodel import Session, select, desc

from ..models.engine import Engine
from ..models.telemetry import TelemetryFrame
from ..models.vibration import VibrationBurst, VibrationFeature
from ..models.fault import FaultEvent
from ..models.health import HealthRecord
from ..models.prognostics import PrognosticSnapshot
from ..models.mission import Mission
from ..models.digital_twin import DigitalTwinState
from ..services.telemetry_buffer import telemetry_buffer
from ..services.digital_twin_config import (
    PrototypeDigitalTwinConfig,
    DEFAULT_DIGITAL_TWIN_CONFIG,
    MechanicalThresholds,
    ThermalThresholds,
    LubricationThresholds,
    CombustionFuelThresholds,
    ElectricalThresholds,
    OperatingContextThresholds,
    FreshnessThresholds,
    TrajectoryConfig,
)

from ..schemas.digital_twin import (
    DataFreshnessSummary,
    SourceFreshnessInfo,
    SubsystemHealthState,
    HealthTrajectory,
    ActiveFaultSummary,
    PrognosticsContext,
    MissionContext,
    ThresholdProfileMetadata,
    DigitalTwinSnapshotResponse,
)

# Backward-compatible convenience aliases referencing DEFAULT_DIGITAL_TWIN_CONFIG
TELEMETRY_FRESHNESS_THRESHOLD_SECONDS: float = DEFAULT_DIGITAL_TWIN_CONFIG.freshness.telemetry_freshness_seconds
VIBRATION_FRESHNESS_THRESHOLD_SECONDS: float = DEFAULT_DIGITAL_TWIN_CONFIG.freshness.vibration_freshness_seconds
HEALTH_RECORD_FRESHNESS_THRESHOLD_SECONDS: float = DEFAULT_DIGITAL_TWIN_CONFIG.freshness.health_freshness_seconds
PROGNOSTICS_FRESHNESS_THRESHOLD_SECONDS: float = DEFAULT_DIGITAL_TWIN_CONFIG.freshness.prognostics_freshness_seconds
PROTOTYPE_TREND_TOLERANCE_PERCENT: float = DEFAULT_DIGITAL_TWIN_CONFIG.trajectory.trend_tolerance_percent


class EngineNotFoundError(Exception):
    """Raised when the specified engine does not exist in the database."""
    pass


def _calculate_age_seconds(ts: Optional[datetime], now: datetime) -> Optional[float]:
    """Computes elapsed seconds between an observation timestamp and reference time."""
    if ts is None:
        return None
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    return max(0.0, (now - ts).total_seconds())


def evaluate_data_freshness(
    now: datetime,
    engine: Engine,
    latest_telemetry: Optional[TelemetryFrame],
    latest_burst: Optional[VibrationBurst],
    active_faults: List[FaultEvent],
    all_faults_count: int,
    latest_health: Optional[HealthRecord],
    latest_prognostic: Optional[PrognosticSnapshot],
    active_mission: Optional[Mission],
    freshness_config: Optional[FreshnessThresholds] = None,
) -> DataFreshnessSummary:
    """
    Determines data freshness (AVAILABLE, STALE, UNAVAILABLE) for each
    information stream using configurable prototype thresholds without inventing data.
    """
    cfg = freshness_config or DEFAULT_DIGITAL_TWIN_CONFIG.freshness
    engine_sim = getattr(engine, "is_simulated", True)

    # 1. Telemetry
    if latest_telemetry is None:
        telemetry_freshness = SourceFreshnessInfo(
            status="UNAVAILABLE",
            details="No telemetry frames recorded for engine",
        )
    else:
        age = _calculate_age_seconds(latest_telemetry.timestamp, now)
        is_stale = age is not None and age > cfg.telemetry_freshness_seconds
        telemetry_freshness = SourceFreshnessInfo(
            status="STALE" if is_stale else "AVAILABLE",
            last_timestamp=latest_telemetry.timestamp,
            age_seconds=round(age, 1) if age is not None else None,
            is_simulated=engine_sim,
            details=f"Last frame {age:.1f}s ago (threshold: {cfg.telemetry_freshness_seconds}s)"
            if is_stale else "Active telemetry frame available",
        )

    # 2. Vibration
    if latest_burst is None:
        vibration_freshness = SourceFreshnessInfo(
            status="UNAVAILABLE",
            details="No vibration bursts recorded for engine",
        )
    else:
        age = _calculate_age_seconds(latest_burst.timestamp, now)
        is_stale = age is not None and age > cfg.vibration_freshness_seconds
        vibration_freshness = SourceFreshnessInfo(
            status="STALE" if is_stale else "AVAILABLE",
            last_timestamp=latest_burst.timestamp,
            age_seconds=round(age, 1) if age is not None else None,
            is_simulated=latest_burst.is_simulated,
            details=f"Last burst {age:.1f}s ago (threshold: {cfg.vibration_freshness_seconds}s)"
            if is_stale else "Active vibration burst available",
        )

    # 3. Faults
    faults_freshness = SourceFreshnessInfo(
        status="AVAILABLE",
        last_timestamp=active_faults[0].timestamp if active_faults else None,
        age_seconds=_calculate_age_seconds(active_faults[0].timestamp, now) if active_faults else None,
        is_simulated=None,
        details=f"{len(active_faults)} active faults (total events evaluated: {all_faults_count})",
    )

    # 4. Health History
    if latest_health is None:
        health_freshness = SourceFreshnessInfo(
            status="UNAVAILABLE",
            details="No health records logged for engine",
        )
    else:
        age = _calculate_age_seconds(latest_health.timestamp, now)
        is_stale = age is not None and age > cfg.health_freshness_seconds
        health_freshness = SourceFreshnessInfo(
            status="STALE" if is_stale else "AVAILABLE",
            last_timestamp=latest_health.timestamp,
            age_seconds=round(age, 1) if age is not None else None,
            is_simulated=latest_health.is_simulated,
            details=f"Last health record {age:.1f}s ago" if is_stale else "Recent health record available",
        )

    # 5. Prognostics
    if latest_prognostic is None:
        prognostic_freshness = SourceFreshnessInfo(
            status="UNAVAILABLE",
            details="No prognostic snapshots recorded for engine",
        )
    else:
        age = _calculate_age_seconds(latest_prognostic.timestamp, now)
        is_stale = age is not None and age > cfg.prognostics_freshness_seconds
        prognostic_freshness = SourceFreshnessInfo(
            status="STALE" if is_stale else "AVAILABLE",
            last_timestamp=latest_prognostic.timestamp,
            age_seconds=round(age, 1) if age is not None else None,
            is_simulated=True,
            details=f"Last prognostic snapshot {age:.1f}s ago" if is_stale else "Recent prognostic estimate available",
        )

    # 6. Mission
    if active_mission is None:
        mission_freshness = SourceFreshnessInfo(
            status="UNAVAILABLE",
            details="No mission currently associated with engine",
        )
    else:
        mission_freshness = SourceFreshnessInfo(
            status="AVAILABLE",
            last_timestamp=active_mission.start_time,
            is_simulated=engine_sim,
            details=f"Mission {active_mission.mission_code} ({active_mission.status})",
        )

    return DataFreshnessSummary(
        telemetry=telemetry_freshness,
        vibration=vibration_freshness,
        faults=faults_freshness,
        health_history=health_freshness,
        prognostics=prognostic_freshness,
        mission=mission_freshness,
    )


def determine_simulation_traceability(
    engine: Engine,
    latest_burst: Optional[VibrationBurst],
    latest_health: Optional[HealthRecord],
) -> str:
    """
    Identifies whether the state is derived from SIMULATED, OBSERVED, or MIXED data sources.
    Clearly distinguishes observed telemetry/vibration from simulated inputs.
    """
    flags: List[bool] = []

    engine_sim = getattr(engine, "is_simulated", None)
    if engine_sim is not None:
        flags.append(engine_sim)

    if latest_burst is not None and getattr(latest_burst, "is_simulated", None) is not None:
        flags.append(latest_burst.is_simulated)

    if latest_health is not None and getattr(latest_health, "is_simulated", None) is not None:
        flags.append(latest_health.is_simulated)

    if not flags:
        return "SIMULATED"

    has_sim = any(flags)
    has_obs = any(not f for f in flags)

    if has_sim and has_obs:
        return "MIXED"
    elif has_sim:
        return "SIMULATED"
    else:
        return "OBSERVED"


def evaluate_mechanical_subsystem(
    latest_burst: Optional[VibrationBurst],
    latest_feature: Optional[VibrationFeature],
    latest_telemetry: Optional[TelemetryFrame],
    thresholds: Optional[MechanicalThresholds] = None,
) -> SubsystemHealthState:
    """
    Evaluates mechanical health using vibration RMS, crest factor, kurtosis,
    and spectral indicators based on configurable prototype thresholds.
    """
    cfg = thresholds or DEFAULT_DIGITAL_TWIN_CONFIG.mechanical

    if latest_feature is None and latest_burst is None and (latest_telemetry is None or latest_telemetry.vibration_rms is None):
        return SubsystemHealthState(
            subsystem="MECHANICAL",
            status="UNAVAILABLE",
            health_score=None,
            indicators={},
            notes="No vibration data available from burst feature extraction or telemetry frame.",
        )

    indicators: Dict[str, Any] = {}
    rms_val: Optional[float] = None
    kurtosis_val: Optional[float] = None
    crest_val: Optional[float] = None
    peak_val: Optional[float] = None
    dom_freq: Optional[float] = None

    if latest_feature is not None:
        rms_val = latest_feature.rms
        kurtosis_val = latest_feature.kurtosis
        crest_val = latest_feature.crest_factor
        peak_val = latest_feature.peak
        dom_freq = latest_feature.dominant_frequency
        indicators["rms_g"] = round(rms_val, 4)
        indicators["peak_g"] = round(peak_val, 4) if peak_val is not None else None
        indicators["kurtosis"] = round(kurtosis_val, 3) if kurtosis_val is not None else None
        indicators["crest_factor"] = round(crest_val, 3) if crest_val is not None else None
        indicators["dominant_frequency_hz"] = round(dom_freq, 1) if dom_freq is not None else None
        if latest_burst is not None:
            indicators["axis"] = latest_burst.axis
    elif latest_telemetry is not None and latest_telemetry.vibration_rms is not None:
        rms_val = latest_telemetry.vibration_rms
        indicators["rms_g"] = round(rms_val, 4)
        indicators["source"] = "telemetry_single_channel"

    # Evaluate mechanical condition using configurable thresholds
    score = 100.0
    status = "NOMINAL"
    notes_list: List[str] = []

    if rms_val is not None:
        if rms_val >= cfg.rms_severe_g:
            status = "CRITICAL"
            score -= 40.0
            notes_list.append(f"Severe vibration RMS ({rms_val:.2f}g >= prototype threshold {cfg.rms_severe_g}g)")
        elif rms_val >= cfg.rms_elevated_g:
            if status != "CRITICAL":
                status = "MONITORING"
            score -= 15.0
            notes_list.append(f"Elevated vibration RMS ({rms_val:.2f}g >= prototype threshold {cfg.rms_elevated_g}g)")

    if kurtosis_val is not None:
        if kurtosis_val >= cfg.kurtosis_high:
            if status != "CRITICAL":
                status = "DEGRADED"
            score -= 25.0
            notes_list.append(f"High vibration kurtosis ({kurtosis_val:.2f} >= {cfg.kurtosis_high}) indicating candidate impulsive transients")
        elif kurtosis_val >= cfg.kurtosis_elevated:
            if status not in {"CRITICAL", "DEGRADED"}:
                status = "ANOMALOUS"
            score -= 10.0
            notes_list.append(f"Elevated kurtosis ({kurtosis_val:.2f} >= {cfg.kurtosis_elevated})")

    if crest_val is not None:
        if crest_val >= cfg.crest_factor_high:
            if status not in {"CRITICAL", "DEGRADED"}:
                status = "DEGRADED"
            score -= 15.0
            notes_list.append(f"High crest factor ({crest_val:.2f} >= {cfg.crest_factor_high})")
        elif crest_val >= cfg.crest_factor_elevated:
            if status == "NOMINAL":
                status = "MONITORING"
            score -= 5.0
            notes_list.append(f"Elevated crest factor ({crest_val:.2f} >= {cfg.crest_factor_elevated})")

    sub_score = max(0.0, min(100.0, round(score, 1)))
    notes_str = "; ".join(notes_list) if notes_list else "Vibration baseline nominal."

    return SubsystemHealthState(
        subsystem="MECHANICAL",
        status=status,
        health_score=sub_score,
        indicators=indicators,
        notes=notes_str,
    )


def evaluate_thermal_subsystem(
    latest_telemetry: Optional[TelemetryFrame],
    thresholds: Optional[ThermalThresholds] = None,
) -> SubsystemHealthState:
    """
    Evaluates thermal health using CHT, EGT, and oil temperature
    against configurable prototype thresholds.
    """
    cfg = thresholds or DEFAULT_DIGITAL_TWIN_CONFIG.thermal

    if latest_telemetry is None:
        return SubsystemHealthState(
            subsystem="THERMAL",
            status="UNAVAILABLE",
            health_score=None,
            indicators={},
            notes="No telemetry available for thermal assessment.",
        )

    cht = latest_telemetry.cht
    egt = latest_telemetry.egt
    oil_temp = latest_telemetry.oil_temp

    if cht is None and egt is None and oil_temp is None:
        return SubsystemHealthState(
            subsystem="THERMAL",
            status="UNAVAILABLE",
            health_score=None,
            indicators={},
            notes="Thermal telemetry channels (CHT, EGT, Oil Temp) not present in latest frame.",
        )

    indicators: Dict[str, Any] = {}
    if cht is not None:
        indicators["cht_c"] = round(cht, 1)
    if egt is not None:
        indicators["egt_c"] = round(egt, 1)
    if oil_temp is not None:
        indicators["oil_temp_c"] = round(oil_temp, 1)

    score = 100.0
    status = "NOMINAL"
    notes_list: List[str] = []

    # CHT evaluation
    if cht is not None:
        if cht >= cfg.cht_critical_c:
            status = "CRITICAL"
            score -= 35.0
            notes_list.append(f"Critical CHT ({cht:.1f}°C >= prototype threshold {cfg.cht_critical_c}°C)")
        elif cht >= cfg.cht_degraded_c:
            if status != "CRITICAL":
                status = "DEGRADED"
            score -= 20.0
            notes_list.append(f"High CHT ({cht:.1f}°C >= prototype threshold {cfg.cht_degraded_c}°C)")
        elif cht >= cfg.cht_monitoring_c:
            if status == "NOMINAL":
                status = "MONITORING"
            score -= 10.0
            notes_list.append(f"Elevated CHT ({cht:.1f}°C >= prototype threshold {cfg.cht_monitoring_c}°C)")

    # EGT evaluation
    if egt is not None:
        if egt >= cfg.egt_critical_c:
            status = "CRITICAL"
            score -= 30.0
            notes_list.append(f"Critical EGT ({egt:.1f}°C >= prototype threshold {cfg.egt_critical_c}°C)")
        elif egt >= cfg.egt_degraded_c:
            if status != "CRITICAL":
                status = "DEGRADED"
            score -= 15.0
            notes_list.append(f"Elevated EGT ({egt:.1f}°C >= prototype threshold {cfg.egt_degraded_c}°C)")
        elif egt >= cfg.egt_monitoring_c:
            if status == "NOMINAL":
                status = "MONITORING"
            score -= 8.0
            notes_list.append(f"Marginal EGT ({egt:.1f}°C >= prototype threshold {cfg.egt_monitoring_c}°C)")

    # Oil Temp thermal contribution
    if oil_temp is not None:
        if oil_temp >= cfg.oil_temp_critical_c:
            status = "CRITICAL"
            score -= 30.0
            notes_list.append(f"Critical oil temperature ({oil_temp:.1f}°C >= prototype threshold {cfg.oil_temp_critical_c}°C)")
        elif oil_temp >= cfg.oil_temp_degraded_c:
            if status not in {"CRITICAL", "DEGRADED"}:
                status = "DEGRADED"
            score -= 15.0
            notes_list.append(f"Elevated oil temperature ({oil_temp:.1f}°C >= prototype threshold {cfg.oil_temp_degraded_c}°C)")
        elif oil_temp >= cfg.oil_temp_monitoring_c:
            if status == "NOMINAL":
                status = "MONITORING"
            score -= 5.0
            notes_list.append(f"High-normal oil temperature ({oil_temp:.1f}°C)")

    sub_score = max(0.0, min(100.0, round(score, 1)))
    notes_str = "; ".join(notes_list) if notes_list else "Thermal conditions nominal."

    return SubsystemHealthState(
        subsystem="THERMAL",
        status=status,
        health_score=sub_score,
        indicators=indicators,
        notes=notes_str,
    )


def evaluate_lubrication_subsystem(
    latest_telemetry: Optional[TelemetryFrame],
    thresholds: Optional[LubricationThresholds] = None,
    thermal_cfg: Optional[ThermalThresholds] = None,
) -> SubsystemHealthState:
    """
    Evaluates lubrication health using oil pressure and oil temperature
    against configurable prototype thresholds.
    """
    cfg = thresholds or DEFAULT_DIGITAL_TWIN_CONFIG.lubrication
    t_cfg = thermal_cfg or DEFAULT_DIGITAL_TWIN_CONFIG.thermal

    if latest_telemetry is None:
        return SubsystemHealthState(
            subsystem="LUBRICATION",
            status="UNAVAILABLE",
            health_score=None,
            indicators={},
            notes="No telemetry available for lubrication assessment.",
        )

    oil_press = latest_telemetry.oil_pressure
    oil_temp = latest_telemetry.oil_temp

    if oil_press is None and oil_temp is None:
        return SubsystemHealthState(
            subsystem="LUBRICATION",
            status="UNAVAILABLE",
            health_score=None,
            indicators={},
            notes="Lubrication telemetry channels (oil pressure/temp) missing from frame.",
        )

    indicators: Dict[str, Any] = {}
    if oil_press is not None:
        indicators["oil_pressure_bar"] = round(oil_press, 2)
    if oil_temp is not None:
        indicators["oil_temp_c"] = round(oil_temp, 1)

    score = 100.0
    status = "NOMINAL"
    notes_list: List[str] = []

    if oil_press is not None:
        if oil_press <= cfg.oil_press_critical_low_bar:
            status = "CRITICAL"
            score -= 50.0
            notes_list.append(f"Critically low oil pressure ({oil_press:.2f} bar <= prototype threshold {cfg.oil_press_critical_low_bar} bar)")
        elif oil_press <= cfg.oil_press_degraded_low_bar or oil_press >= cfg.oil_press_degraded_high_bar:
            status = "DEGRADED"
            score -= 25.0
            notes_list.append(f"Abnormal oil pressure ({oil_press:.2f} bar out of prototype operating window)")
        elif oil_press < cfg.oil_press_monitoring_low_bar or oil_press > cfg.oil_press_monitoring_high_bar:
            status = "MONITORING"
            score -= 10.0
            notes_list.append(f"Marginal oil pressure ({oil_press:.2f} bar)")

    if oil_temp is not None and oil_temp >= t_cfg.oil_temp_critical_c:
        status = "CRITICAL"
        score -= 25.0
        notes_list.append(f"Severe oil thermal stress ({oil_temp:.1f}°C)")

    sub_score = max(0.0, min(100.0, round(score, 1)))
    notes_str = "; ".join(notes_list) if notes_list else "Lubrication circuit within nominal bounds."

    return SubsystemHealthState(
        subsystem="LUBRICATION",
        status=status,
        health_score=sub_score,
        indicators=indicators,
        notes=notes_str,
    )


def evaluate_combustion_fuel_subsystem(
    latest_telemetry: Optional[TelemetryFrame],
    thresholds: Optional[CombustionFuelThresholds] = None,
) -> SubsystemHealthState:
    """
    Evaluates combustion and fuel subsystem health using fuel flow and injection timing
    against configurable prototype thresholds.
    """
    cfg = thresholds or DEFAULT_DIGITAL_TWIN_CONFIG.combustion_fuel

    if latest_telemetry is None:
        return SubsystemHealthState(
            subsystem="COMBUSTION_FUEL",
            status="UNAVAILABLE",
            health_score=None,
            indicators={},
            notes="No telemetry available for combustion/fuel assessment.",
        )

    fuel_flow = latest_telemetry.fuel_flow
    inj_timing = latest_telemetry.injection_timing

    if fuel_flow is None:
        return SubsystemHealthState(
            subsystem="COMBUSTION_FUEL",
            status="UNAVAILABLE",
            health_score=None,
            indicators={},
            notes="Fuel flow telemetry channel not present.",
        )

    indicators: Dict[str, Any] = {
        "fuel_flow_lph": round(fuel_flow, 2),
    }
    if inj_timing is not None:
        indicators["injection_timing_deg_btdc"] = round(inj_timing, 1)

    score = 100.0
    status = "NOMINAL"
    notes_list: List[str] = []

    if fuel_flow < cfg.fuel_flow_monitoring_low_lph:
        status = "MONITORING"
        score -= 15.0
        notes_list.append(f"Low fuel delivery rate ({fuel_flow:.1f} L/h < prototype threshold {cfg.fuel_flow_monitoring_low_lph} L/h)")
    elif fuel_flow > cfg.fuel_flow_monitoring_high_lph:
        status = "MONITORING"
        score -= 15.0
        notes_list.append(f"High fuel delivery rate ({fuel_flow:.1f} L/h > prototype threshold {cfg.fuel_flow_monitoring_high_lph} L/h)")

    sub_score = max(0.0, min(100.0, round(score, 1)))
    notes_str = "; ".join(notes_list) if notes_list else "Combustion and fuel delivery nominal."

    return SubsystemHealthState(
        subsystem="COMBUSTION_FUEL",
        status=status,
        health_score=sub_score,
        indicators=indicators,
        notes=notes_str,
    )


def evaluate_electrical_subsystem(
    latest_telemetry: Optional[TelemetryFrame],
    thresholds: Optional[ElectricalThresholds] = None,
) -> SubsystemHealthState:
    """
    Evaluates electrical subsystem using battery bus voltage from telemetry
    against configurable prototype thresholds.
    """
    cfg = thresholds or DEFAULT_DIGITAL_TWIN_CONFIG.electrical

    if latest_telemetry is None or latest_telemetry.battery_voltage is None:
        return SubsystemHealthState(
            subsystem="ELECTRICAL",
            status="UNAVAILABLE",
            health_score=None,
            indicators={},
            notes="Electrical telemetry (battery bus voltage) not present in frame.",
        )

    v_bus = latest_telemetry.battery_voltage
    indicators: Dict[str, Any] = {
        "battery_voltage_v": round(v_bus, 1),
    }

    score = 100.0
    status = "NOMINAL"
    notes_list: List[str] = []

    if v_bus < cfg.voltage_degraded_low_v or v_bus > cfg.voltage_degraded_high_v:
        status = "DEGRADED"
        score -= 30.0
        notes_list.append(f"Abnormal electrical bus voltage ({v_bus:.1f} V)")
    elif v_bus < cfg.voltage_monitoring_low_v or v_bus > cfg.voltage_monitoring_high_v:
        status = "MONITORING"
        score -= 15.0
        notes_list.append(f"Marginal electrical bus voltage ({v_bus:.1f} V)")

    sub_score = max(0.0, min(100.0, round(score, 1)))
    notes_str = "; ".join(notes_list) if notes_list else "Electrical bus voltage nominal."

    return SubsystemHealthState(
        subsystem="ELECTRICAL",
        status=status,
        health_score=sub_score,
        indicators=indicators,
        notes=notes_str,
    )


def evaluate_operating_context_subsystem(
    engine: Engine,
    latest_telemetry: Optional[TelemetryFrame],
    active_mission: Optional[Mission],
    thresholds: Optional[OperatingContextThresholds] = None,
) -> SubsystemHealthState:
    """
    Evaluates operating context (RPM, mission profile, flight altitude)
    against configurable prototype thresholds.
    """
    cfg = thresholds or DEFAULT_DIGITAL_TWIN_CONFIG.operating_context

    indicators: Dict[str, Any] = {
        "engine_serial": engine.serial_number,
        "engine_hours": round(getattr(engine, "total_runtime_hours", 0.0), 1),
    }

    if latest_telemetry is not None and latest_telemetry.rpm is not None:
        indicators["rpm"] = round(latest_telemetry.rpm, 0)
    if latest_telemetry is not None and latest_telemetry.altitude_ft is not None:
        indicators["altitude_ft"] = round(latest_telemetry.altitude_ft, 0)
    if active_mission is not None:
        indicators["mission_code"] = active_mission.mission_code
        indicators["profile_type"] = active_mission.profile_type
        indicators["mission_status"] = active_mission.status

    status = "NOMINAL"
    notes = "Operating context within nominal parameters."

    rpm = indicators.get("rpm")
    if rpm is not None and rpm >= cfg.high_rpm_monitoring:
        status = "MONITORING"
        notes = f"High RPM operational context ({rpm} RPM >= prototype threshold {cfg.high_rpm_monitoring} RPM)"

    return SubsystemHealthState(
        subsystem="OPERATING_CONTEXT",
        status=status,
        health_score=100.0,
        indicators=indicators,
        notes=notes,
    )


def compute_health_trajectory(
    engine: Engine,
    health_records: List[HealthRecord],
    config: Optional[TrajectoryConfig] = None,
) -> HealthTrajectory:
    """
    Computes health trajectory representation using historical HealthRecord entries.
    Classifies trend direction into: IMPROVING, STABLE, DEGRADING, UNKNOWN.
    Uses configurable prototype tolerance trend_tolerance_percent.
    """
    cfg = config or DEFAULT_DIGITAL_TWIN_CONFIG.trajectory
    tol = cfg.trend_tolerance_percent
    count = len(health_records)

    if count == 0:
        return HealthTrajectory(
            current_health=round(engine.health_score, 1),
            previous_health=None,
            trend_direction="UNKNOWN",
            delta_health=None,
            degradation_rate_per_hour=None,
            observation_count=0,
            latest_observation_time=None,
            classification_rule=(
                f"Configurable prototype tolerance: |delta| <= {tol}% classified as STABLE. "
                "Insufficient observations for trend classification."
            ),
        )

    if count == 1:
        rec = health_records[0]
        return HealthTrajectory(
            current_health=round(rec.health_score, 1),
            previous_health=None,
            trend_direction="STABLE",
            delta_health=0.0,
            degradation_rate_per_hour=None,
            observation_count=1,
            latest_observation_time=rec.timestamp,
            classification_rule=(
                f"Configurable prototype tolerance: single observation classified as baseline STABLE"
            ),
        )

    # 2 or more historical observations
    curr = health_records[0]
    prev = health_records[1]

    curr_score = float(curr.health_score)
    prev_score = float(prev.health_score)
    delta = round(curr_score - prev_score, 2)

    if delta < -tol:
        trend = "DEGRADING"
    elif delta > tol:
        trend = "IMPROVING"
    else:
        trend = "STABLE"

    # Compute degradation rate per elapsed hour if timestamps differ
    degradation_rate: Optional[float] = None
    if curr.timestamp and prev.timestamp:
        t_curr = curr.timestamp.replace(tzinfo=timezone.utc) if curr.timestamp.tzinfo is None else curr.timestamp
        t_prev = prev.timestamp.replace(tzinfo=timezone.utc) if prev.timestamp.tzinfo is None else prev.timestamp
        elapsed_hours = (t_curr - t_prev).total_seconds() / 3600.0
        if elapsed_hours > 0.001:
            degradation_rate = round((prev_score - curr_score) / elapsed_hours, 3)

    return HealthTrajectory(
        current_health=round(curr_score, 1),
        previous_health=round(prev_score, 1),
        trend_direction=trend,
        delta_health=delta,
        degradation_rate_per_hour=degradation_rate,
        observation_count=count,
        latest_observation_time=curr.timestamp,
        classification_rule=(
            f"Configurable prototype tolerance: |delta| <= {tol}% classified as STABLE; "
            f"delta > +{tol}% IMPROVING; delta < -{tol}% DEGRADING"
        ),
    )


def determine_operational_status(
    active_faults: List[FaultEvent],
    subsystems: Dict[str, SubsystemHealthState],
    trajectory: HealthTrajectory,
    health_score: float,
) -> str:
    """
    Assigns prototype system-state condition labels:
    - NOMINAL
    - MONITORING
    - ANOMALOUS
    - DEGRADED
    - CRITICAL

    These are decision-support labels, NOT aviation certification or flight-clearance decisions.
    """
    sub_statuses = {s.status for s in subsystems.values()}
    fault_severities = {f.severity.upper() for f in active_faults}

    # CRITICAL
    if "CRITICAL" in fault_severities or "CRITICAL" in sub_statuses or health_score < 40.0:
        return "CRITICAL"

    # DEGRADED
    if "HIGH" in fault_severities or "DEGRADED" in sub_statuses or health_score < 70.0:
        return "DEGRADED"

    # ANOMALOUS
    if "MEDIUM" in fault_severities or "ANOMALOUS" in sub_statuses:
        return "ANOMALOUS"

    # MONITORING
    if "LOW" in fault_severities or "MONITORING" in sub_statuses or trajectory.trend_direction == "DEGRADING":
        return "MONITORING"

    # NOMINAL
    return "NOMINAL"


def generate_explainability_evidence(
    engine: Engine,
    latest_telemetry: Optional[TelemetryFrame],
    latest_feature: Optional[VibrationFeature],
    active_faults: List[FaultEvent],
    trajectory: HealthTrajectory,
    latest_prognostic: Optional[PrognosticSnapshot],
    freshness: DataFreshnessSummary,
    subsystems: Dict[str, SubsystemHealthState],
    config: Optional[PrototypeDigitalTwinConfig] = None,
) -> List[str]:
    """
    Generates explainable, deterministic evidence list referencing actual available backend data.
    Uses calibrated prototype language: "observed", "derived", "candidate indicator",
    "associated fault event", "prototype estimate".
    Does NOT claim confirmed failure or guaranteed prediction.
    """
    cfg = config or DEFAULT_DIGITAL_TWIN_CONFIG
    evidence: List[str] = []

    # 1. Telemetry Evidence
    if latest_telemetry is not None:
        if latest_telemetry.cht is not None and latest_telemetry.cht >= cfg.thermal.cht_monitoring_c:
            evidence.append(
                f"Observed elevated CHT: {latest_telemetry.cht:.1f}°C (prototype monitoring threshold: {cfg.thermal.cht_monitoring_c}°C)"
            )
        if latest_telemetry.egt is not None and latest_telemetry.egt >= cfg.thermal.egt_monitoring_c:
            evidence.append(
                f"Observed elevated EGT: {latest_telemetry.egt:.1f}°C (prototype monitoring threshold: {cfg.thermal.egt_monitoring_c}°C)"
            )
        if latest_telemetry.oil_pressure is not None and latest_telemetry.oil_pressure < cfg.lubrication.oil_press_monitoring_low_bar:
            evidence.append(
                f"Observed low oil pressure: {latest_telemetry.oil_pressure:.2f} bar (nominal range: {cfg.lubrication.oil_press_monitoring_low_bar}-{cfg.lubrication.oil_press_monitoring_high_bar} bar)"
            )
        if latest_telemetry.oil_temp is not None and latest_telemetry.oil_temp >= cfg.thermal.oil_temp_monitoring_c:
            evidence.append(
                f"Observed elevated oil temperature: {latest_telemetry.oil_temp:.1f}°C"
            )
    else:
        evidence.append("Observed telemetry data stream is UNAVAILABLE")

    # 2. Vibration Evidence
    if latest_feature is not None:
        if latest_feature.rms >= cfg.mechanical.rms_elevated_g:
            evidence.append(
                f"Derived elevated vibration RMS: {latest_feature.rms:.3f}g (prototype threshold: {cfg.mechanical.rms_elevated_g}g)"
            )
        if latest_feature.kurtosis is not None and latest_feature.kurtosis >= cfg.mechanical.kurtosis_elevated:
            evidence.append(
                f"Derived elevated kurtosis: {latest_feature.kurtosis:.2f} (candidate impulsive transient signature)"
            )
        if latest_feature.crest_factor is not None and latest_feature.crest_factor >= cfg.mechanical.crest_factor_elevated:
            evidence.append(
                f"Derived elevated crest factor: {latest_feature.crest_factor:.2f}"
            )
        if latest_feature.dominant_frequency is not None:
            evidence.append(
                f"Derived dominant vibration frequency: {latest_feature.dominant_frequency:.1f} Hz"
            )
    elif latest_telemetry is not None and latest_telemetry.vibration_rms is not None:
        evidence.append(
            f"Observed single-channel telemetry vibration RMS: {latest_telemetry.vibration_rms:.3f}g"
        )
    else:
        evidence.append("Vibration feature analysis stream is UNAVAILABLE")

    # 3. Fault Events Evidence
    if active_faults:
        for fault in active_faults:
            evidence.append(
                f"Associated active fault event: {fault.fault_code} ({fault.fault_title}) with severity {fault.severity}"
            )
    else:
        evidence.append("No active fault events currently registered")

    # 4. Health Trajectory Evidence
    if trajectory.trend_direction == "DEGRADING":
        evidence.append(
            f"Health trajectory indicates degrading trend (delta: {trajectory.delta_health:+.1f}% across {trajectory.observation_count} historical observations)"
        )
    elif trajectory.trend_direction == "IMPROVING":
        evidence.append(
            f"Health trajectory indicates improving trend (delta: {trajectory.delta_health:+.1f}%)"
        )
    elif trajectory.trend_direction == "STABLE":
        evidence.append(
            f"Health trajectory indicates stable condition (delta: {trajectory.delta_health:+.1f}%)"
        )
    else:
        evidence.append(
            f"Health trajectory trend is UNKNOWN (observation count: {trajectory.observation_count})"
        )

    # 5. Prognostics Evidence
    if latest_prognostic is not None:
        evidence.append(
            f"Prototype prognostic estimate: {latest_prognostic.rul_nominal_cycles} nominal cycles remaining "
            f"(capability status: {latest_prognostic.mission_capability_status}, reliability score: {latest_prognostic.mission_reliability_score:.1f})"
        )

    # 6. Freshness Evidence notes
    if freshness.telemetry.status == "STALE":
        evidence.append(f"Telemetry stream is STALE ({freshness.telemetry.age_seconds:.0f}s elapsed)")
    if freshness.vibration.status == "STALE":
        evidence.append(f"Vibration stream is STALE ({freshness.vibration.age_seconds:.0f}s elapsed)")

    return evidence


def compute_digital_twin_state(
    engine_id: int,
    session: Session,
    ref_time: Optional[datetime] = None,
    config: Optional[PrototypeDigitalTwinConfig] = None,
) -> DigitalTwinSnapshotResponse:
    """
    Aggregates telemetry, vibration features, active faults, health records,
    prognostics, and mission context to produce a coherent Digital Twin state.
    Deterministic, explainable, and uses configurable prototype thresholds.
    """
    engine = session.get(Engine, engine_id)
    if not engine:
        raise EngineNotFoundError(f"Engine with ID {engine_id} does not exist")

    active_config = config or DEFAULT_DIGITAL_TWIN_CONFIG
    now = ref_time or datetime.now(timezone.utc)

    # 1. Gather latest TelemetryFrame (check in-memory buffer, then database)
    latest_telemetry = telemetry_buffer.get_latest_memory(engine_id)
    if latest_telemetry is None:
        latest_telemetry = session.exec(
            select(TelemetryFrame)
            .where(TelemetryFrame.engine_id == engine_id)
            .order_by(desc(TelemetryFrame.timestamp))
            .limit(1)
        ).first()

    # 2. Gather latest VibrationBurst and associated VibrationFeature
    latest_burst = session.exec(
        select(VibrationBurst)
        .where(VibrationBurst.engine_id == engine_id)
        .order_by(desc(VibrationBurst.timestamp))
        .limit(1)
    ).first()

    latest_feature: Optional[VibrationFeature] = None
    if latest_burst is not None:
        latest_feature = session.exec(
            select(VibrationFeature)
            .where(VibrationFeature.burst_id == latest_burst.id)
            .limit(1)
        ).first()

    # 3. Gather active FaultEvents
    active_faults = session.exec(
        select(FaultEvent)
        .where(FaultEvent.engine_id == engine_id)
        .where(FaultEvent.resolved_at.is_(None))
        .order_by(desc(FaultEvent.timestamp))
    ).all()

    all_faults = session.exec(
        select(FaultEvent)
        .where(FaultEvent.engine_id == engine_id)
    ).all()
    all_faults_count = len(all_faults)

    # 4. Gather HealthRecords (up to 20 recent for trajectory)
    health_records = session.exec(
        select(HealthRecord)
        .where(HealthRecord.engine_id == engine_id)
        .order_by(desc(HealthRecord.timestamp))
        .limit(20)
    ).all()
    latest_health = health_records[0] if health_records else None

    # 5. Gather latest PrognosticSnapshot
    latest_prognostic = session.exec(
        select(PrognosticSnapshot)
        .where(PrognosticSnapshot.engine_id == engine_id)
        .order_by(desc(PrognosticSnapshot.timestamp))
        .limit(1)
    ).first()

    # 6. Gather active or latest Mission
    active_mission = session.exec(
        select(Mission)
        .where(Mission.engine_id == engine_id)
        .where(Mission.status == "ACTIVE")
        .order_by(desc(Mission.created_at))
        .limit(1)
    ).first()
    if not active_mission:
        active_mission = session.exec(
            select(Mission)
            .where(Mission.engine_id == engine_id)
            .order_by(desc(Mission.created_at))
            .limit(1)
        ).first()

    # 7. Evaluate Data Freshness using configured limits
    freshness = evaluate_data_freshness(
        now=now,
        engine=engine,
        latest_telemetry=latest_telemetry,
        latest_burst=latest_burst,
        active_faults=active_faults,
        all_faults_count=all_faults_count,
        latest_health=latest_health,
        latest_prognostic=latest_prognostic,
        active_mission=active_mission,
        freshness_config=active_config.freshness,
    )

    # 8. Determine Simulation Traceability
    state_source = determine_simulation_traceability(
        engine=engine,
        latest_burst=latest_burst,
        latest_health=latest_health,
    )

    # 9. Health-State Fusion by Subsystem with configurable thresholds
    mech_state = evaluate_mechanical_subsystem(
        latest_burst, latest_feature, latest_telemetry, active_config.mechanical
    )
    therm_state = evaluate_thermal_subsystem(
        latest_telemetry, active_config.thermal
    )
    lub_state = evaluate_lubrication_subsystem(
        latest_telemetry, active_config.lubrication, active_config.thermal
    )
    comb_state = evaluate_combustion_fuel_subsystem(
        latest_telemetry, active_config.combustion_fuel
    )
    elec_state = evaluate_electrical_subsystem(
        latest_telemetry, active_config.electrical
    )
    ctx_state = evaluate_operating_context_subsystem(
        engine, latest_telemetry, active_mission, active_config.operating_context
    )

    subsystems: Dict[str, SubsystemHealthState] = {
        "MECHANICAL": mech_state,
        "THERMAL": therm_state,
        "LUBRICATION": lub_state,
        "COMBUSTION_FUEL": comb_state,
        "ELECTRICAL": elec_state,
        "OPERATING_CONTEXT": ctx_state,
    }

    # 10. Health Trajectory with configurable tolerance
    trajectory = compute_health_trajectory(engine, health_records, active_config.trajectory)

    # 11. Overall Health Score
    if trajectory.current_health is not None:
        overall_health = trajectory.current_health
    else:
        overall_health = float(engine.health_score)

    # 12. Operational Status Condition
    operational_status = determine_operational_status(
        active_faults=active_faults,
        subsystems=subsystems,
        trajectory=trajectory,
        health_score=overall_health,
    )

    # 13. Active Fault Summaries
    active_fault_summaries = [
        ActiveFaultSummary(
            id=f.id or 0,
            fault_code=f.fault_code,
            fault_title=f.fault_title,
            severity=f.severity,
            affected_component=f.affected_component,
            timestamp=f.timestamp,
            confidence=f.confidence,
            fusion_summary=f.fusion_summary,
            is_acknowledged=f.is_acknowledged,
        )
        for f in active_faults
    ]

    # 14. Prognostics Context
    prognostics_context: Optional[PrognosticsContext] = None
    if latest_prognostic is not None:
        prognostics_context = PrognosticsContext(
            snapshot_id=latest_prognostic.id,
            timestamp=latest_prognostic.timestamp,
            rul_nominal_cycles=latest_prognostic.rul_nominal_cycles,
            rul_min_cycles=latest_prognostic.rul_min_cycles,
            rul_max_cycles=latest_prognostic.rul_max_cycles,
            mission_capability_status=latest_prognostic.mission_capability_status,
            mission_reliability_score=latest_prognostic.mission_reliability_score,
            safe_operation_minutes=latest_prognostic.safe_operation_minutes,
            confidence_percent=latest_prognostic.confidence_percent,
            is_simulated=True,
        )

    # 15. Mission Context
    mission_context: Optional[MissionContext] = None
    if active_mission is not None:
        altitude = None
        if latest_telemetry and latest_telemetry.altitude_ft is not None:
            altitude = latest_telemetry.altitude_ft
        mission_context = MissionContext(
            mission_id=active_mission.id,
            mission_code=active_mission.mission_code,
            profile_type=active_mission.profile_type,
            status=active_mission.status,
            planned_duration_seconds=active_mission.planned_duration_seconds,
            elapsed_seconds=active_mission.elapsed_seconds,
            altitude_ft=altitude,
        )

    # 16. Evidence generation
    evidence = generate_explainability_evidence(
        engine=engine,
        latest_telemetry=latest_telemetry,
        latest_feature=latest_feature,
        active_faults=active_faults,
        trajectory=trajectory,
        latest_prognostic=latest_prognostic,
        freshness=freshness,
        subsystems=subsystems,
        config=active_config,
    )

    # 17. Threshold Metadata
    threshold_meta = ThresholdProfileMetadata(
        profile_name=active_config.profile_name,
        classification_type=active_config.classification_type,
        description=active_config.description,
    )

    return DigitalTwinSnapshotResponse(
        engine_id=engine.id or engine_id,
        engine_serial_number=engine.serial_number,
        timestamp=now,
        operational_status=operational_status,
        overall_health_score=round(overall_health, 1),
        state_source=state_source,
        subsystems=subsystems,
        health_trajectory=trajectory,
        data_freshness=freshness,
        active_faults=active_fault_summaries,
        prognostics=prognostics_context,
        mission=mission_context,
        evidence=evidence,
        threshold_profile=threshold_meta,
        disclaimer=(
            "Research/prototype Digital Twin demonstrator. Not a certified flight-clearance, "
            "airworthiness determination, or safety-of-flight prediction."
        ),
    )


def refresh_and_persist_digital_twin_state(
    engine_id: int,
    session: Session,
    ref_time: Optional[datetime] = None,
    config: Optional[PrototypeDigitalTwinConfig] = None,
) -> Tuple[DigitalTwinSnapshotResponse, DigitalTwinState]:
    """
    Recomputes the aggregated Digital Twin state and persists/updates the
    composite DigitalTwinState record in the database.
    """
    snapshot = compute_digital_twin_state(engine_id, session, ref_time, config=config)

    # Query or create the composite DigitalTwinState record
    composite_state = session.exec(
        select(DigitalTwinState)
        .where(DigitalTwinState.engine_id == engine_id)
        .where(DigitalTwinState.subassembly == "COMPOSITE_ENGINE")
    ).first()

    # Mechanical amplitude indicator
    mech_sub = snapshot.subsystems.get("MECHANICAL")
    vib_amp = 0.85
    if mech_sub and mech_sub.indicators and "rms_g" in mech_sub.indicators and mech_sub.indicators["rms_g"] is not None:
        vib_amp = float(mech_sub.indicators["rms_g"])

    # Thermal stress level normalized (0.0 to 1.0)
    therm_sub = snapshot.subsystems.get("THERMAL")
    thermal_stress = 0.0
    if therm_sub and therm_sub.health_score is not None:
        thermal_stress = max(0.0, min(1.0, round((100.0 - therm_sub.health_score) / 100.0, 2)))

    # Evidence compact summary (first 3 evidence items)
    evidence_compact = " | ".join(snapshot.evidence[:3]) if snapshot.evidence else None

    if composite_state is None:
        composite_state = DigitalTwinState(
            engine_id=engine_id,
            subassembly="COMPOSITE_ENGINE",
            health_score=snapshot.overall_health_score,
            wear_trend=snapshot.health_trajectory.trend_direction,
            thermal_stress_level=thermal_stress,
            vibration_amplitude_g=vib_amp,
            last_calculated=snapshot.timestamp,
            operational_status=snapshot.operational_status,
            state_source=snapshot.state_source,
            evidence_summary=evidence_compact,
        )
        session.add(composite_state)
    else:
        composite_state.health_score = snapshot.overall_health_score
        composite_state.wear_trend = snapshot.health_trajectory.trend_direction
        composite_state.thermal_stress_level = thermal_stress
        composite_state.vibration_amplitude_g = vib_amp
        composite_state.last_calculated = snapshot.timestamp
        composite_state.operational_status = snapshot.operational_status
        composite_state.state_source = snapshot.state_source
        composite_state.evidence_summary = evidence_compact
        session.add(composite_state)

    session.commit()
    session.refresh(composite_state)

    return snapshot, composite_state
