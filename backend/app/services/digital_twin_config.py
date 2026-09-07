"""
Centralized Configurable Prototype Thresholds for Digital Twin State Aggregation

RESEARCH / PROTOTYPE NOTICE & SAFETY BOUNDARIES:
------------------------------------------------
1. These thresholds are configurable prototype engineering heuristics designed exclusively
   for research, demonstration, and decision-support modeling.
2. They are NOT:
   - OEM or engine manufacturer operational limits
   - Certified operational or safety limits
   - Airworthiness limits or mandatory thresholds
   - Validated universal limits for all piston aircraft engines
3. They provide deterministic, explainable parameter partitions that can be calibrated
   against specific engine models, test bench instruments, or flight records as empirical
   characterization data becomes available.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class MechanicalThresholds:
    """Configurable prototype thresholds for vibration analysis; not an OEM-certified limit."""
    rms_elevated_g: float = 1.2
    rms_severe_g: float = 2.5
    kurtosis_elevated: float = 4.5
    kurtosis_high: float = 7.0
    crest_factor_elevated: float = 2.5
    crest_factor_high: float = 3.5


@dataclass
class ThermalThresholds:
    """Configurable prototype thresholds for thermal health; not an OEM-certified limit."""
    cht_monitoring_c: float = 180.0
    cht_degraded_c: float = 195.0
    cht_critical_c: float = 210.0

    egt_monitoring_c: float = 800.0
    egt_degraded_c: float = 850.0
    egt_critical_c: float = 900.0

    oil_temp_monitoring_c: float = 105.0
    oil_temp_degraded_c: float = 115.0
    oil_temp_critical_c: float = 125.0


@dataclass
class LubricationThresholds:
    """Configurable prototype thresholds for lubrication circuit; not an OEM-certified limit."""
    oil_press_critical_low_bar: float = 2.0
    oil_press_degraded_low_bar: float = 3.0
    oil_press_monitoring_low_bar: float = 3.5
    oil_press_monitoring_high_bar: float = 5.5
    oil_press_degraded_high_bar: float = 6.5


@dataclass
class CombustionFuelThresholds:
    """Configurable prototype thresholds for combustion and fuel; not an OEM-certified limit."""
    fuel_flow_monitoring_low_lph: float = 2.0
    fuel_flow_monitoring_high_lph: float = 60.0


@dataclass
class ElectricalThresholds:
    """Configurable prototype thresholds for electrical bus telemetry; not an OEM-certified limit."""
    voltage_degraded_low_v: float = 22.0
    voltage_monitoring_low_v: float = 24.0
    voltage_monitoring_high_v: float = 30.0
    voltage_degraded_high_v: float = 32.0


@dataclass
class OperatingContextThresholds:
    """Configurable prototype thresholds for flight operating context; not an OEM-certified limit."""
    high_rpm_monitoring: float = 5800.0


@dataclass
class FreshnessThresholds:
    """Configurable prototype thresholds for data freshness in seconds; not an OEM-certified limit."""
    telemetry_freshness_seconds: float = 300.0      # 5 minutes
    vibration_freshness_seconds: float = 600.0      # 10 minutes
    health_freshness_seconds: float = 3600.0        # 1 hour
    prognostics_freshness_seconds: float = 3600.0    # 1 hour


@dataclass
class TrajectoryConfig:
    """Configurable prototype tolerance for health trajectory classification; not an OEM-certified limit."""
    trend_tolerance_percent: float = 1.0


@dataclass
class PrototypeDigitalTwinConfig:
    """
    Unified prototype Digital Twin configuration containing all subsystem evaluation thresholds.

    IMPORTANT:
    All parameters are configurable prototype heuristics for research and decision-support
    demonstrators. They do not constitute certified manufacturer limits or airworthiness rules.
    """
    profile_name: str = "PROTOTYPE_DEFAULT"
    classification_type: str = "CONFIGURABLE_PROTOTYPE_HEURISTICS"
    description: str = (
        "Configurable prototype thresholds for research/decision-support demonstration; "
        "not an OEM-certified engine limit."
    )

    mechanical: MechanicalThresholds = field(default_factory=MechanicalThresholds)
    thermal: ThermalThresholds = field(default_factory=ThermalThresholds)
    lubrication: LubricationThresholds = field(default_factory=LubricationThresholds)
    combustion_fuel: CombustionFuelThresholds = field(default_factory=CombustionFuelThresholds)
    electrical: ElectricalThresholds = field(default_factory=ElectricalThresholds)
    operating_context: OperatingContextThresholds = field(default_factory=OperatingContextThresholds)
    freshness: FreshnessThresholds = field(default_factory=FreshnessThresholds)
    trajectory: TrajectoryConfig = field(default_factory=TrajectoryConfig)


# Default prototype configuration instance
DEFAULT_DIGITAL_TWIN_CONFIG = PrototypeDigitalTwinConfig()


def get_default_config() -> PrototypeDigitalTwinConfig:
    """Returns a fresh instance of the default prototype Digital Twin configuration."""
    return PrototypeDigitalTwinConfig()
