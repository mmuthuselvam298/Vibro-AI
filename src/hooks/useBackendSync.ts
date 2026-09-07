import { useEffect, useRef, useState } from 'react';
import { getEngines } from '@/lib/api/client';
import {
  syncTelemetry,
  syncVibration,
  DEFAULT_TELEMETRY_SYNC_INTERVAL_MS,
  DEFAULT_VIBRATION_SYNC_INTERVAL_MS,
} from '@/lib/api/sync';
import type { SyncStatus, UseBackendSyncOptions } from '@/lib/api/types';

/**
 * Hook to coordinate periodic synchronization of the frontend simulation state
 * to the FastAPI backend.
 *
 * Guarantees:
 * 1. Independent of the 50 ms / 20 Hz simulation tick.
 * 2. Strictly rate-limited to configurable intervals (default 2s telemetry, 4s vibration).
 * 3. In-flight overlap protection prevents duplicate concurrent requests during slow network responses.
 * 4. Graceful handling of backend outages without interrupting the offline simulation or dashboard UI.
 * 5. Full timer cleanup on unmount or disable.
 */
export function useBackendSync({
  enabled = true,
  engineId,
  telemetryIntervalMs = DEFAULT_TELEMETRY_SYNC_INTERVAL_MS,
  vibrationIntervalMs = DEFAULT_VIBRATION_SYNC_INTERVAL_MS,
}: UseBackendSyncOptions = {}) {
  const [resolvedEngineId, setResolvedEngineId] = useState<number | null>(
    typeof engineId === 'number' ? engineId : null,
  );

  const [status, setStatus] = useState<SyncStatus>({
    enabled,
    activeEngineId: typeof engineId === 'number' ? engineId : null,
    isTelemetryInFlight: false,
    isVibrationInFlight: false,
    lastTelemetrySync: null,
    lastVibrationSync: null,
    lastTelemetryStatus: null,
    telemetryPersisted: null,
    backendConnected: null,
    lastError: null,
  });

  const telemetryInFlightRef = useRef(false);
  const vibrationInFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  // Synchronize resolvedEngineId if caller changes prop
  useEffect(() => {
    if (typeof engineId === 'number') {
      setResolvedEngineId(engineId);
    }
  }, [engineId]);

  // Discover an active engine from backend if engineId was not provided
  useEffect(() => {
    if (!enabled || engineId !== undefined) {
      return;
    }

    let isSubscribed = true;

    async function discoverEngine() {
      try {
        const engines = await getEngines();
        if (isSubscribed && engines && engines.length > 0) {
          setResolvedEngineId(engines[0].id);
        }
      } catch {
        // Backend unavailable; fallback to default demo engine ID
        const fallbackId =
          Number(
            typeof import.meta !== 'undefined' &&
              import.meta.env &&
              import.meta.env.VITE_DEFAULT_ENGINE_ID,
          ) || 1;
        if (isSubscribed) {
          setResolvedEngineId(fallbackId);
        }
      }
    }

    discoverEngine();

    return () => {
      isSubscribed = false;
    };
  }, [enabled, engineId]);

  // Main synchronization intervals
  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || resolvedEngineId === null) {
      setStatus((prev) => ({
        ...prev,
        enabled: false,
        activeEngineId: null,
        isTelemetryInFlight: false,
        isVibrationInFlight: false,
      }));
      return;
    }

    const currentEngineId = resolvedEngineId;

    setStatus((prev) => ({
      ...prev,
      enabled: true,
      activeEngineId: currentEngineId,
    }));

    // --- Telemetry Sync Scheduler ---
    const runTelemetrySync = async () => {
      if (telemetryInFlightRef.current || !isMountedRef.current) {
        return; // Skip cycle if previous request is still in-flight
      }

      telemetryInFlightRef.current = true;
      setStatus((prev) => ({ ...prev, isTelemetryInFlight: true }));

      try {
        const response = await syncTelemetry(currentEngineId);
        if (isMountedRef.current) {
          setStatus((prev) => ({
            ...prev,
            isTelemetryInFlight: false,
            lastTelemetrySync: response.timestamp,
            lastTelemetryStatus: response.status,
            telemetryPersisted: response.persisted_to_db,
            backendConnected: true,
            lastError: null,
          }));
        }
      } catch (err) {
        if (isMountedRef.current) {
          const message = err instanceof Error ? err.message : String(err);
          setStatus((prev) => ({
            ...prev,
            isTelemetryInFlight: false,
            backendConnected: false,
            lastError: message,
          }));
        }
      } finally {
        telemetryInFlightRef.current = false;
      }
    };

    // --- Vibration Sync Scheduler ---
    const runVibrationSync = async () => {
      if (vibrationInFlightRef.current || !isMountedRef.current) {
        return; // Skip cycle if previous request is still in-flight
      }

      vibrationInFlightRef.current = true;
      setStatus((prev) => ({ ...prev, isVibrationInFlight: true }));

      try {
        const response = await syncVibration(currentEngineId);
        if (isMountedRef.current && response) {
          setStatus((prev) => ({
            ...prev,
            isVibrationInFlight: false,
            lastVibrationSync: response.burst.timestamp,
            backendConnected: true,
            lastError: null,
          }));
        } else if (isMountedRef.current) {
          setStatus((prev) => ({
            ...prev,
            isVibrationInFlight: false,
          }));
        }
      } catch (err) {
        if (isMountedRef.current) {
          const message = err instanceof Error ? err.message : String(err);
          setStatus((prev) => ({
            ...prev,
            isVibrationInFlight: false,
            backendConnected: false,
            lastError: message,
          }));
        }
      } finally {
        vibrationInFlightRef.current = false;
      }
    };

    // Initial triggers shortly after mount
    const initialTelemetryTimer = setTimeout(runTelemetrySync, 500);
    const initialVibrationTimer = setTimeout(runVibrationSync, 1000);

    // Periodic scheduled sync loops
    const telemetryInterval = setInterval(runTelemetrySync, Math.max(500, telemetryIntervalMs));
    const vibrationInterval = setInterval(runVibrationSync, Math.max(1000, vibrationIntervalMs));

    return () => {
      isMountedRef.current = false;
      clearTimeout(initialTelemetryTimer);
      clearTimeout(initialVibrationTimer);
      clearInterval(telemetryInterval);
      clearInterval(vibrationInterval);
      telemetryInFlightRef.current = false;
      vibrationInFlightRef.current = false;
    };
  }, [enabled, resolvedEngineId, telemetryIntervalMs, vibrationIntervalMs]);

  return status;
}
