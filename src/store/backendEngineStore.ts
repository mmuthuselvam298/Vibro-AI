import { create } from 'zustand';
import type {
  DigitalTwinSnapshotResponse,
  PrognosticSnapshotRead,
  FaultEventRead,
  MaintenanceAdvisoryResponse,
  TelemetryFrameRead,
  VibrationBurstRead,
  VibrationFeatureRead,
  HealthRecordRead,
} from '@/lib/api/types';
import {
  getDigitalTwinState,
  getLatestPrognostics,
  getFaults,
  getMaintenanceAdvisories,
  getEngines,
} from '@/lib/api/client';

export const DEFAULT_DIGITAL_TWIN_REFRESH_INTERVAL_MS =
  Number(
    typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_DIGITAL_TWIN_REFRESH_INTERVAL_MS,
  ) || 2000;

export interface BackendEngineStore {
  digitalTwin: DigitalTwinSnapshotResponse | null;
  prognostics: PrognosticSnapshotRead | null;
  faults: FaultEventRead[];
  maintenance: MaintenanceAdvisoryResponse[];
  telemetry: TelemetryFrameRead | null;
  vibration: VibrationBurstRead | null;
  vibrationFeatures: VibrationFeatureRead | null;
  health: HealthRecordRead | null;

  loading: boolean;
  error: string | null;
  backendConnected: boolean | null;
  lastUpdated: string | null;
  selectedEngineId: number | null;

  setSelectedEngineId: (id: number | null) => void;
  fetchState: (targetEngineId?: number | null) => Promise<void>;
  reset: () => void;
}

let inFlight = false;

export const useBackendEngineStore = create<BackendEngineStore>((set, get) => ({
  digitalTwin: null,
  prognostics: null,
  faults: [],
  maintenance: [],
  telemetry: null,
  vibration: null,
  vibrationFeatures: null,
  health: null,

  loading: false,
  error: null,
  backendConnected: null,
  lastUpdated: null,
  selectedEngineId:
    Number(
      typeof import.meta !== 'undefined' &&
        import.meta.env &&
        import.meta.env.VITE_DEFAULT_ENGINE_ID,
    ) || 1,

  setSelectedEngineId: (id: number | null) => {
    set({ selectedEngineId: id });
  },

  reset: () => {
    set({
      digitalTwin: null,
      prognostics: null,
      faults: [],
      maintenance: [],
      telemetry: null,
      vibration: null,
      vibrationFeatures: null,
      health: null,
      loading: false,
      error: null,
      backendConnected: null,
      lastUpdated: null,
    });
  },

  fetchState: async (targetEngineId?: number | null) => {
    // 1. Overlap guard: if a fetch is already in-flight, skip this polling cycle
    if (inFlight) {
      return;
    }

    let id = targetEngineId !== undefined ? targetEngineId : get().selectedEngineId;

    // 2. Discover engine ID if still null
    if (id === null) {
      try {
        const engines = await getEngines();
        if (engines && engines.length > 0) {
          id = engines[0].id;
          set({ selectedEngineId: id });
        }
      } catch {
        id =
          Number(
            typeof import.meta !== 'undefined' &&
              import.meta.env &&
              import.meta.env.VITE_DEFAULT_ENGINE_ID,
          ) || 1;
        set({ selectedEngineId: id });
      }
    }

    if (id === null) {
      return;
    }

    inFlight = true;

    // Only set loading to true on first fetch to avoid UI flickering during polling
    if (!get().digitalTwin) {
      set({ loading: true });
    }

    try {
      // 3. Coordinated parallel fetches with Promise.allSettled for endpoint-level fault tolerance
      const [dtRes, progRes, faultsRes, maintRes] = await Promise.allSettled([
        getDigitalTwinState(id),
        getLatestPrognostics(id),
        getFaults(id, { limit: 10 }),
        getMaintenanceAdvisories(id),
      ]);

      const updates: Partial<BackendEngineStore> = {
        lastUpdated: new Date().toISOString(),
        loading: false,
      };

      if (dtRes.status === 'fulfilled') {
        updates.digitalTwin = dtRes.value;
        updates.backendConnected = true;
        updates.error = null;
      } else {
        // Digital Twin endpoint failed (backend offline or 404/500)
        updates.backendConnected = false;
        updates.error =
          dtRes.reason instanceof Error
            ? dtRes.reason.message
            : String(dtRes.reason);
      }

      if (progRes.status === 'fulfilled') {
        updates.prognostics = progRes.value;
      }

      if (faultsRes.status === 'fulfilled') {
        updates.faults = faultsRes.value;
      }

      if (maintRes.status === 'fulfilled') {
        updates.maintenance = maintRes.value;
      }

      set(updates);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({
        backendConnected: false,
        error: message,
        loading: false,
      });
    } finally {
      inFlight = false;
    }
  },
}));
