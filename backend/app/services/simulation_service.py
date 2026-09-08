"""
Authoritative Server-Owned Simulation Service

Generates deterministic synthetic engine telemetry, vibration signals,
and mission phase context for digital twin and diagnostic evaluation.

Supported Scenarios:
- HEALTHY
- EARLY_BEARING_WEAR
- SEVERE_BEARING_WEAR
- PISTON_SLAP
- VALVE_LASH
- ROLLING_ELEMENT_DEFECT
- SENSOR_DRIFT

Supported Mission Phases:
- TAKEOFF
- CLIMB
- CRUISE
- LANDING
"""

import math
import random
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

SAMPLE_RATE_HZ = 1024
NUM_SAMPLES = 512

@dataclass
class EngineSimulationState:
    engine_id: int = 1
    engine_serial: str = "ENG-001"
    scenario: str = "HEALTHY"
    mission_phase: str = "CRUISE"
    time_offset: float = 0.0
    operating_cycle: int = 142
    mission_time_seconds: float = 1200.0
    degradation_accumulated: float = 0.0

class SimulationService:
    def __init__(self):
        self._states: Dict[int, EngineSimulationState] = {}

    def get_state(self, engine_id: int = 1) -> EngineSimulationState:
        if engine_id not in self._states:
            self._states[engine_id] = EngineSimulationState(engine_id=engine_id)
        return self._states[engine_id]

    def set_scenario(self, engine_id: int, scenario: str) -> EngineSimulationState:
        state = self.get_state(engine_id)
        state.scenario = scenario
        # Reset degradation rate tracking when switching scenario
        state.degradation_accumulated = 0.0
        return state

    def set_mission_phase(self, engine_id: int, phase: str) -> EngineSimulationState:
        state = self.get_state(engine_id)
        state.mission_phase = phase
        return state

    def step(self, engine_id: int = 1, dt_seconds: float = 0.1) -> Dict[str, Any]:
        """
        Advances simulation clock by dt_seconds and generates one complete,
        coherent telemetry frame and vibration burst.
        """
        state = self.get_state(engine_id)
        state.time_offset += dt_seconds
        state.mission_time_seconds += dt_seconds
        t = state.time_offset
        rng = random.Random(int(t * 100) % 100000)

        # 1. Operating parameters determined by Mission Phase
        phase = state.mission_phase
        if phase == "TAKEOFF":
            target_rpm = 3850.0
            expected_cht = 165.0
            expected_egt = 745.0
            expected_oil_p = 4.9
            expected_oil_t = 92.0
            expected_fuel_flow = 22.5
            baseline_rms = 0.95
        elif phase == "CLIMB":
            target_rpm = 3750.0
            expected_cht = 158.0
            expected_egt = 730.0
            expected_oil_p = 4.7
            expected_oil_t = 90.0
            expected_fuel_flow = 20.2
            baseline_rms = 0.88
        elif phase == "LANDING":
            target_rpm = 3100.0
            expected_cht = 142.0
            expected_egt = 670.0
            expected_oil_p = 4.2
            expected_oil_t = 84.0
            expected_fuel_flow = 14.2
            baseline_rms = 0.72
        else:  # CRUISE default
            target_rpm = 3600.0
            expected_cht = 152.0
            expected_egt = 710.0
            expected_oil_p = 4.6
            expected_oil_t = 88.0
            expected_fuel_flow = 17.8
            baseline_rms = 0.82

        # Add minor engine throttle fluctuations
        rpm = target_rpm + (math.sin(t * 0.4) * 15.0) + (rng.uniform(-5.0, 5.0))
        expected_rpm = target_rpm
        f0 = rpm / 60.0  # fundamental rotational frequency in Hz

        # 2. Fault injections based on Scenario
        scenario = state.scenario
        cht = expected_cht + rng.uniform(-1.0, 1.0)
        egt = expected_egt + rng.uniform(-2.0, 2.0)
        oil_pressure = expected_oil_p + rng.uniform(-0.05, 0.05)
        oil_temp = expected_oil_t + rng.uniform(-0.5, 0.5)
        fuel_flow = expected_fuel_flow + rng.uniform(-0.2, 0.2)
        battery_voltage = 28.2 + rng.uniform(-0.1, 0.1)
        injection_timing = 28.0 + rng.uniform(-0.2, 0.2)
        expected_vibration_rms = baseline_rms

        # Raw vibration waveform array
        raw_samples = [0.0] * NUM_SAMPLES
        dt_sample = 1.0 / SAMPLE_RATE_HZ

        for i in range(NUM_SAMPLES):
            st = (i * dt_sample) + t
            # Baseline shaft harmonics (1X, 2X, 3X)
            val = 1.0 * math.sin(2 * math.pi * f0 * st)
            val += 0.35 * math.sin(2 * math.pi * (2 * f0) * st + 0.5)
            val += 0.15 * math.sin(2 * math.pi * (3 * f0) * st + 1.2)
            val += (rng.uniform(-0.5, 0.5)) * 0.32

            if scenario == "EARLY_BEARING_WEAR":
                # Outer race fault BPFO ~ 2.5 * f0 with 1.2 kHz resonant ringing decay
                bpfo = 2.5 * f0
                impact_phase = (st % (1.0 / bpfo)) * bpfo
                val += math.exp(-42.0 * impact_phase) * math.sin(2 * math.pi * 1200.0 * st) * 1.85
                val += (rng.uniform(-0.5, 0.5)) * 0.35

            elif scenario == "SEVERE_BEARING_WEAR":
                bpfo = 2.5 * f0
                impact_phase = (st % (1.0 / bpfo)) * bpfo
                val += math.exp(-22.0 * impact_phase) * math.sin(2 * math.pi * 1200.0 * st) * 4.2
                val += 0.9 * math.sin(2 * math.pi * (2 * bpfo) * st)
                val += (rng.uniform(-0.5, 0.5)) * 1.1

            elif scenario == "PISTON_SLAP":
                piston_freq = 0.5 * f0
                phase_p = st % (1.0 / piston_freq)
                if phase_p < 0.007:
                    val += (rng.uniform(-0.5, 0.5)) * 6.5

            elif scenario == "VALVE_LASH":
                valve_freq = 0.5 * f0
                val += (math.sin(2 * math.pi * valve_freq * st) ** 18) * 2.8
                val += 0.85 * math.sin(2 * math.pi * (4.0 * f0) * st)

            elif scenario == "ROLLING_ELEMENT_DEFECT":
                bsf = 1.333 * f0
                ftf = 0.4 * f0
                mod = 0.5 + 0.5 * math.sin(2 * math.pi * ftf * st)
                val += (math.sin(2 * math.pi * bsf * st) ** 14) * 3.4 * mod

            elif scenario == "SENSOR_DRIFT":
                # Static DC bias offset added to sensor output without actual mechanical changes
                val += 1.15

            raw_samples[i] = val

        # Calculate observed vibration RMS from samples
        mean_sq = sum(x * x for x in raw_samples) / NUM_SAMPLES
        vibration_rms = round(math.sqrt(mean_sq), 3)

        # Apply secondary thermo-hydraulic effects based on scenario
        if scenario == "EARLY_BEARING_WEAR":
            oil_temp += 3.5
            state.degradation_accumulated += 0.002
        elif scenario == "SEVERE_BEARING_WEAR":
            oil_temp += 8.2
            oil_pressure -= 0.4
            state.degradation_accumulated += 0.010
        elif scenario == "PISTON_SLAP":
            cht += 14.0
            state.degradation_accumulated += 0.005
        elif scenario == "VALVE_LASH":
            egt += 22.0
            state.degradation_accumulated += 0.003
        elif scenario == "SENSOR_DRIFT":
            # In sensor drift, oil temp and engine temperatures remain perfectly nominal!
            pass

        now_iso = datetime.now(timezone.utc).isoformat()

        frame = {
            "engine_id": state.engine_id,
            "engine_serial": state.engine_serial,
            "timestamp": now_iso,
            "mission_time_seconds": round(state.mission_time_seconds, 1),
            "operating_cycle": state.operating_cycle,
            "mission_phase": state.mission_phase,
            "scenario": state.scenario,
            "data_source": "SIMULATED",
            "telemetry": {
                "rpm": round(rpm, 1),
                "expected_rpm": round(expected_rpm, 1),
                "cht": round(cht, 1),
                "expected_cht": round(expected_cht, 1),
                "egt": round(egt, 1),
                "expected_egt": round(expected_egt, 1),
                "oil_pressure": round(oil_pressure, 2),
                "expected_oil_pressure": round(expected_oil_p, 2),
                "oil_temp": round(oil_temp, 1),
                "expected_oil_temp": round(expected_oil_t, 1),
                "fuel_flow": round(fuel_flow, 1),
                "expected_fuel_flow": round(expected_fuel_flow, 1),
                "vibration_rms": round(vibration_rms, 3),
                "expected_vibration_rms": round(expected_vibration_rms, 3),
                "battery_voltage": round(battery_voltage, 2),
                "injection_timing": round(injection_timing, 1),
            },
            "vibration": {
                "axis": "Z",
                "sampling_rate_hz": SAMPLE_RATE_HZ,
                "samples_count": NUM_SAMPLES,
                "rms_g": round(vibration_rms, 3),
                "samples": [round(x, 4) for x in raw_samples],
            },
        }
        return frame

# Global singleton
_sim_service_singleton: Optional[SimulationService] = None

def get_simulation_service() -> SimulationService:
    global _sim_service_singleton
    if _sim_service_singleton is None:
        _sim_service_singleton = SimulationService()
    return _sim_service_singleton
