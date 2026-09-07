"""
Telemetry Ingestion & Downsampling Buffer Service

Sampling Strategy:
------------------
The MALE UAV engine digital twin frontend/edge simulation updates at a high rate (~20 Hz / 50 ms).
Writing each 50 ms frame directly to SQLite would result in ~20 writes/second, causing lock
contention, unnecessary I/O thrashing, and database file bloat.

This service implements a deterministic temporal downsampling strategy:
1. Every incoming telemetry frame immediately updates an in-memory cache (`_latest_telemetry`)
   so that real-time UI/API readers (`GET /api/engines/{id}/telemetry/latest`) always observe
   sub-50ms live operational data.
2. The frame is only persisted to SQLite if at least `min_interval_seconds` (default: 2.0s)
   has elapsed since the last database write for that engine.
3. High-frequency frames arriving between persistence intervals return `persisted_to_db=False`
   and `status="buffered_in_memory"`.
"""

import os
import time
from typing import Optional
from ..models.telemetry import TelemetryFrame


class TelemetryBufferService:
    def __init__(self, default_interval: float = 2.0):
        # Configurable via environment variable or constructor
        env_interval = os.getenv("TELEMETRY_SAMPLING_INTERVAL_SECONDS")
        self.min_interval_seconds = float(env_interval) if env_interval else default_interval

        # In-memory stores
        # engine_id -> TelemetryFrame (most recent live frame)
        self._latest_telemetry: dict[int, TelemetryFrame] = {}
        # engine_id -> unix timestamp of last database write
        self._last_persisted_time: dict[int, float] = {}

    def should_persist(self, engine_id: int, current_timestamp: Optional[float] = None) -> bool:
        """
        Determines whether the incoming frame should be written to the database
        based on the minimum sampling interval.
        """
        now = current_timestamp if current_timestamp is not None else time.time()
        last_time = self._last_persisted_time.get(engine_id)

        if last_time is None:
            return True

        return (now - last_time) >= self.min_interval_seconds

    def record_persisted(self, engine_id: int, current_timestamp: Optional[float] = None) -> None:
        """Records the timestamp of a successful database commit."""
        self._last_persisted_time[engine_id] = current_timestamp if current_timestamp is not None else time.time()

    def update_latest_memory(self, engine_id: int, frame: TelemetryFrame) -> None:
        """Stores the most recent frame in in-memory cache for zero-latency retrieval."""
        self._latest_telemetry[engine_id] = frame

    def get_latest_memory(self, engine_id: int) -> Optional[TelemetryFrame]:
        """Retrieves the latest in-memory frame for an engine."""
        return self._latest_telemetry.get(engine_id)

    def reset(self) -> None:
        """Clears in-memory buffers (primarily used for test isolation)."""
        self._latest_telemetry.clear()
        self._last_persisted_time.clear()


# Global singleton instance for application use
telemetry_buffer = TelemetryBufferService()
