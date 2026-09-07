import { useEffect } from 'react';
import {
  useBackendEngineStore,
  DEFAULT_DIGITAL_TWIN_REFRESH_INTERVAL_MS,
} from '@/store/backendEngineStore';

export interface UseBackendEngineStateOptions {
  engineId?: number | null;
  refreshIntervalMs?: number;
  enabled?: boolean;
}

/**
 * Hook to access and automatically refresh the authoritative backend Digital Twin state.
 *
 * Guarantees:
 * 1. Immediate initial fetch upon mount (no waiting for interval delay).
 * 2. Periodic background refresh at configurable interval (default 2000 ms; never 20 Hz).
 * 3. In-flight overlap guard prevents duplicate concurrent requests.
 * 4. Clean timer teardown on component unmount.
 * 5. Independent endpoint fault tolerance with graceful offline fallback.
 */
export function useBackendEngineState({
  engineId,
  refreshIntervalMs = DEFAULT_DIGITAL_TWIN_REFRESH_INTERVAL_MS,
  enabled = true,
}: UseBackendEngineStateOptions = {}) {
  const store = useBackendEngineStore();

  const activeId = engineId !== undefined ? engineId : store.selectedEngineId;

  // Immediate initial fetch on mount or when engineId changes
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    store.fetchState(activeId);

    const interval = setInterval(() => {
      if (isMounted) {
        store.fetchState(activeId);
      }
    }, Math.max(1000, refreshIntervalMs));

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [enabled, activeId, refreshIntervalMs]);

  return {
    digitalTwin: store.digitalTwin,
    prognostics: store.prognostics,
    faults: store.faults,
    maintenance: store.maintenance,
    telemetry: store.telemetry,
    vibration: store.vibration,
    vibrationFeatures: store.vibrationFeatures,
    health: store.health,
    loading: store.loading,
    error: store.error,
    backendConnected: store.backendConnected,
    lastUpdated: store.lastUpdated,
    selectedEngineId: store.selectedEngineId,
    refresh: () => store.fetchState(activeId),
  };
}
