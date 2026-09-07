"""
Rule-Based Maintenance Advisory Generation Service

DISCLAIMER & PROTOTYPE BOUNDARIES:
----------------------------------
1. This service provides deterministic, rule-based advisory mapping based strictly on
   explicitly recorded fault codes and severity levels.
2. It is a decision-support heuristic, NOT an AI-generated prediction, machine-learning
   diagnostic model, or autonomous dispatch system.
3. It does NOT invent operational maintenance intervals or cycle counts.
4. It does NOT constitute flight clearance, airworthiness certification, or manufacturer-approved
   maintenance manuals.
5. All inspection intervals and corrective procedures must be determined in accordance with
   applicable authorized maintenance procedures and certified technical publications.
"""

from typing import Dict, Any


def generate_rule_based_advisory(
    fault_code: str,
    severity: str,
    affected_component: str = "NONE",
    fusion_summary: str = "",
) -> Dict[str, Any]:
    """
    Maps an explicitly recorded fault type and severity to a general rule-based
    engineering inspection recommendation with qualitative priority categories:
    - IMMEDIATE_REVIEW
    - PRIORITY_REVIEW
    - NEXT_SCHEDULED_INSPECTION
    - INFORMATIONAL
    - NONE
    """
    code_upper = fault_code.upper().strip()
    sev_upper = severity.upper().strip()
    comp_upper = affected_component.upper().strip()

    # Default baseline
    advisory = {
        "target_component": comp_upper if comp_upper != "NONE" else "GENERAL_POWERTRAIN",
        "action_type": "INSPECTION",
        "urgency": "NEXT_SCHEDULED_INSPECTION",
        "prescribed_action": (
            "Routine maintenance inspection recommended; verify telemetry channels "
            "and review component condition in accordance with authorized technical data."
        ),
        "advisory_source": "RULE_BASED_HEURISTIC",
        "evidence_summary": fusion_summary or "Baseline nominal operation.",
    }

    # 1. Bearing-related wear / defect
    if "BEARING" in code_upper or "ROLLING" in code_upper or comp_upper in {"BEARING", "ROLLING_ELEMENT"}:
        advisory["target_component"] = "BEARING"
        if sev_upper == "CRITICAL":
            advisory["urgency"] = "IMMEDIATE_REVIEW"
            advisory["action_type"] = "INSPECTION"
            advisory["prescribed_action"] = (
                "Immediate technical review recommended: Inspect main bearing condition for raceway spalling "
                "and check scavenge filter for metallic particulate according to authorized maintenance manual."
            )
        elif sev_upper == "HIGH":
            advisory["urgency"] = "PRIORITY_REVIEW"
            advisory["action_type"] = "INSPECTION"
            advisory["prescribed_action"] = (
                "Priority inspection recommended: Schedule borescope examination of bearing raceways and "
                "inspect oil filter for particulate; determine maintenance interval according to authorized procedure."
            )
        else:
            advisory["urgency"] = "NEXT_SCHEDULED_INSPECTION"
            advisory["action_type"] = "INSPECTION"
            advisory["prescribed_action"] = (
                "Inspect main crank bearing outer race during next scheduled maintenance inspection."
            )

    # 2. Piston slap / cylinder bore
    elif "PISTON" in code_upper or comp_upper == "PISTON":
        advisory["target_component"] = "PISTON"
        advisory["action_type"] = "INSPECTION"
        advisory["urgency"] = "PRIORITY_REVIEW" if sev_upper in {"HIGH", "CRITICAL"} else "NEXT_SCHEDULED_INSPECTION"
        advisory["prescribed_action"] = (
            "Priority inspection recommended: Check piston-to-bore clearances and inspect cylinder walls "
            "for scuffing or mechanical wear according to authorized maintenance procedure."
        )

    # 3. Valve lash / valvetrain
    elif "VALVE" in code_upper or comp_upper == "VALVE":
        advisory["target_component"] = "VALVE"
        advisory["action_type"] = "INSPECTION"
        advisory["urgency"] = "NEXT_SCHEDULED_INSPECTION"
        advisory["prescribed_action"] = (
            "Inspect overhead valve train and verify tappet clearances during next scheduled maintenance inspection."
        )

    # 4. Combustion / Misfire / Injector
    elif any(k in code_upper for k in ["MISFIRE", "INJECTOR", "COMBUSTION"]) or comp_upper == "FUEL_INJECTOR":
        advisory["target_component"] = "FUEL_INJECTOR"
        advisory["action_type"] = "INSPECTION"
        advisory["urgency"] = "PRIORITY_REVIEW" if sev_upper in {"HIGH", "CRITICAL"} else "NEXT_SCHEDULED_INSPECTION"
        advisory["prescribed_action"] = (
            "Priority inspection recommended: Inspect ignition harness, spark plugs, and fuel injector nozzles; "
            "perform cylinder compression check according to authorized maintenance procedure."
        )

    # 5. Lubrication starvation / pressure drop
    elif "LUBRICATION" in code_upper or "OIL" in code_upper or comp_upper == "OIL_SYSTEM":
        advisory["target_component"] = "OIL_SYSTEM"
        advisory["action_type"] = "INSPECTION"
        if sev_upper == "CRITICAL":
            advisory["urgency"] = "IMMEDIATE_REVIEW"
            advisory["prescribed_action"] = (
                "Immediate technical review recommended: Inspect oil pump relief valve, scavenge filter, "
                "and oil cooler supply lines for blockage or flow restriction."
            )
        else:
            advisory["urgency"] = "PRIORITY_REVIEW"
            advisory["prescribed_action"] = (
                "Priority inspection recommended: Inspect lubrication system, scavenge filter, and examine "
                "oil condition according to authorized maintenance procedure."
            )

    # 6. Overheating / Thermal runaway
    elif "HEAT" in code_upper or comp_upper == "COOLING_SYSTEM":
        advisory["target_component"] = "COOLING_SYSTEM"
        advisory["action_type"] = "INSPECTION"
        advisory["urgency"] = "IMMEDIATE_REVIEW" if sev_upper == "CRITICAL" else "PRIORITY_REVIEW"
        advisory["prescribed_action"] = (
            "Priority inspection recommended: Inspect cooling cowling shroud, ducting, and cylinder head "
            "thermal dissipation path according to authorized maintenance procedure."
        )

    # 7. Sensor drift / instrumentation calibration
    elif "DRIFT" in code_upper or "SENSOR" in code_upper or comp_upper == "SENSOR_ADXL":
        advisory["target_component"] = "SENSOR_ADXL"
        advisory["action_type"] = "RECALIBRATION"
        advisory["urgency"] = "NEXT_SCHEDULED_INSPECTION"
        advisory["prescribed_action"] = (
            "Informational / calibration check recommended: Perform sensor zero-bias check on accelerometer channel "
            "and verify transducer mounting torque."
        )

    return advisory
