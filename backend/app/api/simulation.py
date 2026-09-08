"""
Simulation & System Trace Control REST API

Allows REST clients (and automated tests) to:
1. Trigger server-owned demo scenarios (EARLY_BEARING_WEAR, SENSOR_DRIFT, etc.)
2. Advance/inspect current simulation telemetry
3. Fetch real-time System Trace explaining the complete inference chain
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from ..services.simulation_service import get_simulation_service
from ..services.intelligence_service import get_intelligence_service

simulation_router = APIRouter(prefix="/simulation", tags=["Simulation"])

class ScenarioUpdateRequest(BaseModel):
    engine_id: int = Field(default=1, description="Engine identifier")
    scenario: str = Field(description="Scenario name: HEALTHY, EARLY_BEARING_WEAR, SENSOR_DRIFT, etc.")

class MissionPhaseUpdateRequest(BaseModel):
    engine_id: int = Field(default=1, description="Engine identifier")
    phase: str = Field(description="Mission phase: TAKEOFF, CLIMB, CRUISE, LANDING")

@simulation_router.get("/state")
def get_simulation_state(engine_id: int = 1):
    sim = get_simulation_service()
    intel = get_intelligence_service()

    frame = sim.step(engine_id, dt_seconds=0.0)
    diag = intel.analyze_frame(
        telemetry_frame=frame["telemetry"],
        vibration_samples=frame["vibration"]["samples"],
        sampling_rate_hz=frame["vibration"]["sampling_rate_hz"],
    )

    return {
        "status": "success",
        "frame": frame,
        "diagnosis": diag,
    }

@simulation_router.post("/scenario")
def set_simulation_scenario(req: ScenarioUpdateRequest):
    sim = get_simulation_service()
    intel = get_intelligence_service()

    state = sim.set_scenario(req.engine_id, req.scenario)
    frame = sim.step(req.engine_id, dt_seconds=0.05)
    diag = intel.analyze_frame(
        telemetry_frame=frame["telemetry"],
        vibration_samples=frame["vibration"]["samples"],
    )

    return {
        "status": "scenario_updated",
        "engine_id": req.engine_id,
        "scenario": state.scenario,
        "candidate_fault": diag["candidate_fault"],
        "severity": diag["severity"],
        "agreement": diag["evidence_agreement"],
    }

@simulation_router.post("/phase")
def set_simulation_phase(req: MissionPhaseUpdateRequest):
    sim = get_simulation_service()
    state = sim.set_mission_phase(req.engine_id, req.phase)

    return {
        "status": "phase_updated",
        "engine_id": req.engine_id,
        "phase": state.mission_phase,
    }

@simulation_router.get("/system-trace")
def get_system_trace(engine_id: int = 1):
    sim = get_simulation_service()
    intel = get_intelligence_service()

    frame = sim.step(engine_id, dt_seconds=0.0)
    diag = intel.analyze_frame(
        telemetry_frame=frame["telemetry"],
        vibration_samples=frame["vibration"]["samples"],
    )

    trace = [
        {
            "step": 1,
            "stage": "SENSOR",
            "title": "Raw Accelerometer Signal Acquisition",
            "detail": f"{frame['vibration']['samples_count']} samples @ {frame['vibration']['sampling_rate_hz']} Hz (RMS: {frame['telemetry']['vibration_rms']:.3f}g)",
            "status": "NOMINAL",
            "source": frame["data_source"],
        },
        {
            "step": 2,
            "stage": "DSP",
            "title": "Fourier Spectrum & Moment Extraction",
            "detail": f"Dominant: {diag['dominant_frequency_hz']:.1f} Hz ({diag['dominant_band']}), Kurtosis: {diag['dsp_metrics']['kurtosis']:.2f}, Crest Factor: {diag['dsp_metrics']['crest_factor']:.2f}",
            "status": "EVALUATED",
            "source": "Radix-2 FFT + Statistical Extraction",
        },
        {
            "step": 3,
            "stage": "INTELLIGENCE",
            "title": "Hybrid Multi-Evidence Synthesis",
            "detail": f"{diag['candidate_fault']} ({diag['severity']}) - {diag['evidence_agreement']}",
            "status": diag["severity"],
            "source": diag["source"],
        },
        {
            "step": 4,
            "stage": "HEALTH",
            "title": "Subsystem Health Aggregation",
            "detail": f"Estimated Engine Health: {diag['health_score']}%",
            "status": "NOMINAL" if diag["health_score"] >= 90 else ("WATCH" if diag["health_score"] >= 75 else "DEGRADED"),
            "source": "Degradation Evaluation",
        },
        {
            "step": 5,
            "stage": "RUL",
            "title": "Prototype Operating Margin Estimate",
            "detail": f"~{diag['rul_cycles']} operating cycles ({diag['degradation_rate_per_100_cycles']}% degradation / 100 cycles)",
            "status": "PROTOTYPE_ESTIMATE",
            "source": "Deterministic Trend Engine",
        },
        {
            "step": 6,
            "stage": "DIGITAL_TWIN",
            "title": "Subsystem State Mapping",
            "detail": f"Subsystem: {diag['affected_component']} flagged as {diag['severity']}",
            "status": diag["severity"],
            "source": "Digital Twin Synchronizer",
        },
        {
            "step": 7,
            "stage": "MISSION",
            "title": f"Mission Phase Risk ({frame['mission_phase']})",
            "detail": f"{diag['mission_risk']['risk_level']}: {diag['mission_risk']['explanation']}",
            "status": diag["mission_risk"]["risk_level"],
            "source": "Contextual Mission Risk Rules",
        },
        {
            "step": 8,
            "stage": "DECISION_SUPPORT",
            "title": "Maintenance Action Advisory",
            "detail": diag["recommended_action"],
            "status": "ACTION_RECOMMENDED" if diag["severity"] != "NOMINAL" else "NOMINAL",
            "source": "Decision Support Rulebook",
        },
    ]

    return {
        "engine_id": engine_id,
        "scenario": frame["scenario"],
        "trace": trace,
        "timestamp": frame["timestamp"],
    }
