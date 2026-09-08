"""
FastAPI WebSocket Streaming Router

Streams real-time server-owned telemetry, vibration samples, DSP metrics,
and hybrid intelligence state over WebSockets at a practical rate (10-15 Hz).

Endpoints:
- /ws/telemetry
- /api/ws/telemetry
"""

import json
import asyncio
import logging
from typing import Set, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from ..services.simulation_service import get_simulation_service
from ..services.intelligence_service import get_intelligence_service

logger = logging.getLogger(__name__)

websocket_router = APIRouter(tags=["WebSocket"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Remaining: {len(self.active_connections)}")

manager = ConnectionManager()

async def _stream_telemetry(websocket: WebSocket, engine_id: int):
    sim = get_simulation_service()
    intel = get_intelligence_service()

    interval = 0.08  # ~12.5 Hz streaming rate
    running = True

    async def listen_for_client_commands():
        nonlocal running
        try:
            while running:
                raw_text = await websocket.receive_text()
                try:
                    msg = json.loads(raw_text)
                    action = msg.get("action")
                    if action == "set_scenario":
                        scenario = msg.get("scenario", "HEALTHY")
                        sim.set_scenario(engine_id, scenario)
                        await websocket.send_json({
                            "type": "command_ack",
                            "action": "set_scenario",
                            "scenario": scenario,
                        })
                    elif action == "set_phase":
                        phase = msg.get("phase", "CRUISE")
                        sim.set_mission_phase(engine_id, phase)
                        await websocket.send_json({
                            "type": "command_ack",
                            "action": "set_phase",
                            "phase": phase,
                        })
                    elif action == "ping":
                        await websocket.send_json({"type": "pong", "time": asyncio.get_event_loop().time()})
                except Exception as e:
                    logger.warning(f"Error handling client WebSocket message: {e}")
        except (WebSocketDisconnect, asyncio.CancelledError):
            running = False

    listener_task = asyncio.create_task(listen_for_client_commands())

    try:
        while running:
            # Step simulation clock
            frame = sim.step(engine_id, dt_seconds=interval)

            # Analyze frame through DSP + ML + Physics intelligence
            diag = intel.analyze_frame(
                telemetry_frame=frame["telemetry"],
                vibration_samples=frame["vibration"]["samples"],
                sampling_rate_hz=frame["vibration"]["sampling_rate_hz"],
            )

            # Build Judge-Facing System Trace
            system_trace = {
                "sensor": {
                    "stage": "SENSOR",
                    "status": "ACTIVE_ACQUISITION",
                    "rms_g": frame["telemetry"]["vibration_rms"],
                    "sampling_rate_hz": 1024,
                    "source": frame["data_source"],
                },
                "dsp": {
                    "stage": "DSP",
                    "dominant_freq_hz": diag["dominant_frequency_hz"],
                    "dominant_band": diag["dominant_band"],
                    "kurtosis": diag["dsp_metrics"]["kurtosis"],
                    "crest_factor": diag["dsp_metrics"]["crest_factor"],
                    "high_freq_ratio": diag["dsp_metrics"]["high_freq_energy_ratio"],
                },
                "intelligence": {
                    "stage": "INTELLIGENCE",
                    "candidate_fault": diag["candidate_fault"],
                    "severity": diag["severity"],
                    "confidence": diag["confidence"],
                    "agreement": diag["evidence_agreement"],
                },
                "health": {
                    "stage": "HEALTH",
                    "score": diag["health_score"],
                    "status": "NOMINAL" if diag["health_score"] >= 90 else ("WATCH" if diag["health_score"] >= 75 else "DEGRADED"),
                },
                "rul": {
                    "stage": "RUL",
                    "rul_cycles": diag["rul_cycles"],
                    "degradation_rate": diag["degradation_rate_per_100_cycles"],
                },
                "digital_twin": {
                    "stage": "DIGITAL_TWIN",
                    "subsystem": diag["affected_component"],
                    "status": diag["severity"],
                },
                "mission": {
                    "stage": "MISSION",
                    "phase": frame["mission_phase"],
                    "risk_level": diag["mission_risk"]["risk_level"],
                },
                "decision_support": {
                    "stage": "DECISION_SUPPORT",
                    "action": diag["recommended_action"],
                },
            }

            payload = {
                "type": "engine_state",
                "timestamp": frame["timestamp"],
                "engine_id": frame["engine_id"],
                "engine_serial": frame["engine_serial"],
                "scenario": frame["scenario"],
                "mission_phase": frame["mission_phase"],
                "data_source": frame["data_source"],
                "telemetry": frame["telemetry"],
                "vibration": frame["vibration"],
                "diagnosis": diag,
                "system_trace": system_trace,
            }

            await websocket.send_json(payload)
            await asyncio.sleep(interval)

    except WebSocketDisconnect:
        logger.info("Client disconnected from telemetry stream")
    except Exception as e:
        logger.error(f"WebSocket telemetry streaming error: {e}")
    finally:
        running = False
        listener_task.cancel()
        manager.disconnect(websocket)


@websocket_router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket, engine_id: int = Query(default=1)):
    await manager.connect(websocket)
    await _stream_telemetry(websocket, engine_id)


@websocket_router.websocket("/api/ws/telemetry")
async def websocket_telemetry_api_endpoint(websocket: WebSocket, engine_id: int = Query(default=1)):
    await manager.connect(websocket)
    await _stream_telemetry(websocket, engine_id)
