"""
Prognostics & What-If Simulation Service

PROTOTYPE RESEARCH & DECISION-SUPPORT NOTICE:
--------------------------------------------
1. This service provides deterministic, prototype trend-based Remaining Useful Life (RUL)
   estimates and what-if mission stress projections for research and decision-support demonstration.
2. It does NOT use a certified neural network or claim flight-qualified RUL accuracy.
3. It does NOT prescribe manufacturer-approved maintenance intervals, mandatory cycle limits,
   grounding rules, or airworthiness clearances.
4. All metrics are simulation-based estimates reflecting configured prototype thresholds.
5. All What-If scenarios reflect configured prototype simulation assumptions rather than
   experimentally validated physics or statistically validated ML predictions.
"""

from dataclasses import dataclass
from typing import Any, Dict


# =====================================================================
# Configurable Prototype Thresholds
# =====================================================================
# NOTE: These are configurable prototype planning parameters for decision-support
# demonstration. They are NOT real engine limits, manufacturer limits, certified
# operational limits, or universal aviation health limits.
DEFAULT_PROTOTYPE_HCRIT: float = 20.0
DEFAULT_PROTOTYPE_PLANNING_THRESHOLD: float = 40.0


# =====================================================================
# Centralized Prototype What-If Simulation Coefficients
# =====================================================================
@dataclass(frozen=True)
class PrototypeWhatIfScenarioConfig:
    """
    Configurable prototype simulation assumptions for What-If scenario evaluations.

    IMPORTANT:
    These coefficients are illustrative prototype simulation parameters designed for
    decision-support demonstration. They are NOT measured, experimentally established,
    or physically guaranteed values from an engine OEM. They represent configurable
    simulation assumptions that can be calibrated or replaced as empirical test bench
    data becomes available.
    """
    action: str
    action_label: str
    stress_reduction_assumption_percent: float  # Configured prototype stress-reduction assumption
    rul_extension_factor: float                 # Configured simulation RUL multiplier
    health_recovery_offset: float               # Configured illustrative health adjustment
    reliability_boost_offset: float             # Configured illustrative reliability adjustment
    simulated_projected_status: str
    recommendation_note: str


PROTOTYPE_WHAT_IF_CONFIGS: Dict[str, PrototypeWhatIfScenarioConfig] = {
    "REDUCE_LOAD_15": PrototypeWhatIfScenarioConfig(
        action="REDUCE_LOAD_15",
        action_label="Simulated Throttling Back (-15% Manifold Load)",
        stress_reduction_assumption_percent=24.0,
        rul_extension_factor=1.32,
        health_recovery_offset=1.8,
        reliability_boost_offset=16.0,
        simulated_projected_status="MISSION SUSTAINABLE",
        recommendation_note=(
            "Illustrative prototype projection based on configured simulation factor: "
            "assumes reduced journal bearing contact pressure and thermal dissipation load."
        ),
    ),
    "REDUCE_RPM_10": PrototypeWhatIfScenarioConfig(
        action="REDUCE_RPM_10",
        action_label="Simulated RPM Reduction (-10% Rotational Speed)",
        stress_reduction_assumption_percent=19.0,
        rul_extension_factor=1.22,
        health_recovery_offset=1.2,
        reliability_boost_offset=11.0,
        simulated_projected_status="IMPACT MITIGATED",
        recommendation_note=(
            "Illustrative prototype projection based on configured simulation factor: "
            "assumes reduced dynamic cyclic velocity at bearing raceways."
        ),
    ),
    "RETURN_TO_BASE": PrototypeWhatIfScenarioConfig(
        action="RETURN_TO_BASE",
        action_label="Simulated Immediate Return to Base (RTB)",
        stress_reduction_assumption_percent=38.0,
        rul_extension_factor=1.0,
        health_recovery_offset=0.0,
        reliability_boost_offset=32.0,
        simulated_projected_status="SAFETY RESERVE ENHANCED",
        recommendation_note=(
            "Illustrative prototype projection based on configured simulation factor: "
            "assumes truncated operating exposure duration to finish within configured prototype margin."
        ),
    ),
    "BASELINE": PrototypeWhatIfScenarioConfig(
        action="BASELINE",
        action_label="Maintain Current Flight Envelope (No Action)",
        stress_reduction_assumption_percent=0.0,
        rul_extension_factor=1.0,
        health_recovery_offset=0.0,
        reliability_boost_offset=0.0,
        simulated_projected_status="NOMINAL ENVELOPE",
        recommendation_note=(
            "Illustrative prototype projection: maintains current operational mechanical load "
            "and baseline prototype degradation rate without operational alteration."
        ),
    ),
}


def estimate_trend_rul(
    current_health: float,
    degradation_rate_per_100c: float = 0.5,
    severity: str = "NOMINAL",
    prototype_health_threshold: float = DEFAULT_PROTOTYPE_PLANNING_THRESHOLD,
) -> Dict[str, Any]:
    """
    Computes prototype trend-based RUL in cycles based on health margin and degradation rate.

    IMPORTANT RESEARCH NOTICE:
    Uses a configured prototype planning threshold (default: 40.0% health; baseline critical floor Hcrit: 20.0%).
    This is an illustrative decision-support boundary for prototype demonstration, NOT a real engine limit,
    manufacturer limit, certified operational threshold, or universal aviation health limit.
    """
    effective_health_margin = max(0.0, current_health - prototype_health_threshold)

    rate_per_cycle = max(0.05, degradation_rate_per_100c) / 100.0

    sev_upper = severity.upper().strip()
    if sev_upper == "CRITICAL":
        rate_per_cycle *= 1.8
    elif sev_upper == "HIGH":
        rate_per_cycle *= 1.4
    elif sev_upper == "MEDIUM":
        rate_per_cycle *= 1.15

    raw_cycles = effective_health_margin / rate_per_cycle if rate_per_cycle > 0 else 200
    rul_nominal = int(max(4, min(220, round(raw_cycles))))

    # Prototype illustrative uncertainty spread (heuristic spread factor; NOT a statistically validated confidence interval)
    spread_fraction = 0.22 if sev_upper == "CRITICAL" else 0.16 if sev_upper == "HIGH" else 0.10
    rul_min = int(max(2, round(rul_nominal * (1 - spread_fraction))))
    rul_max = int(round(rul_nominal * (1 + spread_fraction)))

    # Prototype confidence and quality indicator score (illustrative index, NOT a statistically validated probability)
    confidence = 88.5 if sev_upper == "CRITICAL" else 90.2 if sev_upper == "HIGH" else 94.8

    return {
        "rul_nominal_cycles": rul_nominal,
        "rul_min_cycles": rul_min,
        "rul_max_cycles": rul_max,
        "confidence_percent": confidence,
        "degradation_rate_per_10cycles": round(rate_per_cycle * 10, 2),
        "prototype_threshold_health": prototype_health_threshold,
        "configured_prototype_hcrit": DEFAULT_PROTOTYPE_HCRIT,
    }


def estimate_mission_reliability(
    current_health: float,
    rul_nominal: int,
    mission_elapsed_seconds: float = 0.0,
    mission_total_seconds: float = 7200.0,
    severity: str = "NOMINAL",
) -> Dict[str, Any]:
    """
    Computes transparent prototype mission reliability index and decision-support guidance.

    IMPORTANT:
    Operating horizon metrics are prototype planning estimates based on configured simulation criteria.
    They do not represent certified safe operating limits or guarantees.
    """
    remaining_seconds = max(0.0, mission_total_seconds - mission_elapsed_seconds)
    remaining_minutes = remaining_seconds / 60.0

    # 1 cycle ≈ 1.5 minutes of tactical mission operation (prototype planning assumption)
    projected_flight_minutes = rul_nominal * 1.5
    margin_ratio = projected_flight_minutes / remaining_minutes if remaining_minutes > 0 else 3.0

    rul_margin_factor = min(1.0, max(0.15, margin_ratio / 1.5))

    sev_upper = severity.upper().strip()
    severity_penalties = {
        "CRITICAL": 0.65,
        "HIGH": 0.35,
        "MEDIUM": 0.15,
        "LOW": 0.05,
        "NOMINAL": 0.0,
    }
    severity_penalty = severity_penalties.get(sev_upper, 0.0)

    raw_reliability = (current_health / 100.0) * rul_margin_factor * (1.0 - severity_penalty) * 100.0
    reliability_score = round(min(99.4, max(8.0, raw_reliability)), 1)

    status = "MISSION_CAPABLE"
    if reliability_score < 45.0 or margin_ratio < 0.9 or sev_upper == "CRITICAL":
        status = "MISSION_AT_RISK"
    elif reliability_score < 70.0 or margin_ratio < 1.4 or sev_upper in {"HIGH", "MEDIUM"}:
        status = "ENHANCED_MONITORING"

    # Operational decision-support recommendation
    if sev_upper == "CRITICAL" or reliability_score < 35.0 or current_health < 50.0:
        action = "RETURN_TO_BASE"
        reason = "Degradation trend indicates component health approaches configured prototype threshold; return to base recommended for inspection."
    elif sev_upper == "HIGH" or reliability_score < 58.0 or margin_ratio < 1.3:
        action = "REDUCE_ENGINE_LOAD_15"
        reason = "Elevated mechanical stress observed; load reduction recommended to preserve configured prototype margins."
    elif sev_upper == "MEDIUM" or reliability_score < 78.0 or margin_ratio < 1.8:
        action = "CONTINUE_WITH_ENHANCED_MONITORING"
        reason = "Early anomalous telemetry detected; projected prototype operating margin exceeds mission duration with enhanced monitoring."
    else:
        action = "CONTINUE_MISSION"
        reason = "Engine telemetry aligns with baseline healthy envelope; projected prototype margins exceed mission requirements."

    return {
        "mission_reliability_score": reliability_score,
        "mission_capability_status": status,
        "safe_operation_minutes": int(round(projected_flight_minutes)),
        "margin_ratio": round(margin_ratio, 2),
        "recommended_action": action,
        "primary_reason": reason,
    }


def evaluate_what_if_action(
    action: str,
    current_health: float,
    current_rul: int,
    current_reliability: float,
    environmental_factor: str = "STANDARD",
) -> Dict[str, Any]:
    """
    Evaluates simulated what-if consequences of operational profile or load alterations
    using centralized prototype simulation assumptions.
    """
    act_upper = action.upper().strip()
    cfg = PROTOTYPE_WHAT_IF_CONFIGS.get(act_upper, PROTOTYPE_WHAT_IF_CONFIGS["BASELINE"])

    projected_health = min(100.0, round(current_health + cfg.health_recovery_offset, 1))
    projected_rul = int(round(current_rul * cfg.rul_extension_factor))
    projected_rel = min(99.0, round(current_reliability + cfg.reliability_boost_offset, 1))

    # Dynamic status adjustment for baseline when reliability is low
    projected_status = cfg.simulated_projected_status
    if cfg.action == "BASELINE" and current_reliability < 70.0:
        projected_status = "ACCELERATING DEGRADATION"

    return {
        "action": cfg.action,
        "action_label": cfg.action_label,
        "simulated_projected_health": projected_health,
        "simulated_projected_rul_cycles": projected_rul,
        "simulated_projected_reliability": projected_rel,
        "simulated_stress_reduction_percent": cfg.stress_reduction_assumption_percent,
        "simulated_projected_status": projected_status,
        "recommendation_note": cfg.recommendation_note,
    }
