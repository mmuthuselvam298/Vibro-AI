import type {
  BackendHealthResponse,
  Engine,
  TelemetryFrameRead,
  TelemetryIngest,
  TelemetryIngestResponse,
  VibrationBurstRead,
  VibrationBurstIngest,
  VibrationFeatureRead,
  VibrationAnalysisResponse,
  HealthRecordRead,
  PrognosticSnapshotRead,
  FaultEventRead,
  MaintenanceAdvisoryResponse,
  DigitalTwinSnapshotResponse,
  FaultsFilterOptions,
} from './types';

/**
 * Default fallback backend URL:
 * - Local development (DEV): defaults to local FastAPI server 'http://127.0.0.1:8000'
 * - Production (PROD): defaults to same-origin relative path '' for Vercel deployment
 */
export const DEFAULT_API_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
    ? 'http://127.0.0.1:8000'
    : '';

/**
 * Resolved API base URL, sourced from Vite environment variables with environment-aware fallback.
 */
export const API_BASE_URL: string =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  typeof import.meta.env.VITE_API_BASE_URL === 'string' &&
  import.meta.env.VITE_API_BASE_URL.trim() !== ''
    ? import.meta.env.VITE_API_BASE_URL.trim()
    : DEFAULT_API_BASE_URL;

/**
 * Custom error class for API communication failures.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;

  constructor(status: number, statusText: string, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

/**
 * Shared generic request helper for FastAPI backend endpoints.
 * Provides safe JSON parsing, status validation, and informative error formatting.
 */
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${cleanPath}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      `Failed to connect to backend at ${url}: ${message}`,
    );
  }

  if (!response.ok) {
    let errorBody: unknown = null;
    let detailMessage = `Request failed with status ${response.status} (${response.statusText})`;

    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        errorBody = await response.json();
        if (typeof errorBody === 'object' && errorBody !== null) {
          const dict = errorBody as Record<string, unknown>;
          if (typeof dict.detail === 'string') {
            detailMessage = dict.detail;
          } else if (Array.isArray(dict.detail)) {
            // FastAPI Pydantic validation error list
            detailMessage = dict.detail
              .map((d: unknown) => (typeof d === 'object' && d !== null ? (d as Record<string, unknown>).msg || JSON.stringify(d) : String(d)))
              .join('; ');
          } else if (typeof dict.message === 'string') {
            detailMessage = dict.message;
          }
        }
      } else {
        const text = await response.text();
        if (text) {
          detailMessage = text.slice(0, 200);
        }
      }
    } catch {
      // Body reading failed, retain statusText default
    }

    throw new ApiError(response.status, response.statusText, detailMessage, errorBody);
  }

  return (await response.json()) as T;
}

/**
 * Test backend connectivity and retrieve service status.
 * Checks /health, falling back to /api/health if needed.
 */
export async function checkBackendHealth(): Promise<BackendHealthResponse> {
  try {
    return await apiRequest<BackendHealthResponse>('/health');
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return await apiRequest<BackendHealthResponse>('/api/health');
    }
    throw err;
  }
}

/**
 * Retrieve all registered engines from the backend fleet.
 */
export async function getEngines(): Promise<Engine[]> {
  return apiRequest<Engine[]>('/api/engines');
}

/**
 * Retrieve a specific engine record by its primary key ID.
 */
export async function getEngine(engineId: number): Promise<Engine> {
  return apiRequest<Engine>(`/api/engines/${engineId}`);
}

/**
 * Retrieve the latest telemetry frame for an engine (cached or persisted).
 */
export async function getLatestTelemetry(engineId: number): Promise<TelemetryFrameRead> {
  return apiRequest<TelemetryFrameRead>(`/api/engines/${engineId}/telemetry/latest`);
}

/**
 * Retrieve the most recent vibration burst recorded for an engine.
 */
export async function getLatestVibrationBurst(engineId: number): Promise<VibrationBurstRead> {
  return apiRequest<VibrationBurstRead>(`/api/engines/${engineId}/vibration/latest`);
}

/**
 * Retrieve the latest extracted vibration feature set for an engine.
 */
export async function getLatestVibrationFeatures(engineId: number): Promise<VibrationFeatureRead> {
  return apiRequest<VibrationFeatureRead>(`/api/engines/${engineId}/vibration/features/latest`);
}

/**
 * Retrieve the comprehensive aggregated Digital Twin state for an engine.
 */
export async function getDigitalTwinState(engineId: number): Promise<DigitalTwinSnapshotResponse> {
  return apiRequest<DigitalTwinSnapshotResponse>(`/api/engines/${engineId}/digital-twin`);
}

/**
 * Retrieve the most recent health record for an engine.
 */
export async function getLatestHealthRecord(engineId: number): Promise<HealthRecordRead> {
  return apiRequest<HealthRecordRead>(`/api/engines/${engineId}/health/latest`);
}

/**
 * Retrieve the latest prognostic assessment snapshot for an engine.
 */
export async function getLatestPrognostics(engineId: number): Promise<PrognosticSnapshotRead> {
  return apiRequest<PrognosticSnapshotRead>(`/api/engines/${engineId}/prognostics/latest`);
}

/**
 * Retrieve chronological fault events for an engine with optional filtering.
 */
export async function getFaults(
  engineId: number,
  options: FaultsFilterOptions = {},
): Promise<FaultEventRead[]> {
  const params = new URLSearchParams();
  if (options.severity) params.set('severity', options.severity);
  if (options.fault_code) params.set('fault_code', options.fault_code);
  if (typeof options.is_acknowledged === 'boolean') {
    params.set('is_acknowledged', String(options.is_acknowledged));
  }
  if (typeof options.active_only === 'boolean') {
    params.set('active_only', String(options.active_only));
  }
  if (options.limit) params.set('limit', String(options.limit));

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<FaultEventRead[]>(`/api/engines/${engineId}/faults${query}`);
}

/**
 * Retrieve active rule-based maintenance advisories for an engine.
 */
export async function getMaintenanceAdvisories(
  engineId: number,
): Promise<MaintenanceAdvisoryResponse[]> {
  return apiRequest<MaintenanceAdvisoryResponse[]>(
    `/api/engines/${engineId}/maintenance/advisories`,
  );
}

/**
 * Ingest a telemetry frame to the backend buffer / persistence pipeline.
 */
export async function ingestTelemetry(
  payload: TelemetryIngest,
): Promise<TelemetryIngestResponse> {
  return apiRequest<TelemetryIngestResponse>('/api/telemetry/ingest', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Ingest a vibration burst to the backend DSP and feature extraction pipeline.
 */
export async function ingestVibrationBurst(
  engineId: number,
  payload: VibrationBurstIngest,
): Promise<VibrationAnalysisResponse> {
  return apiRequest<VibrationAnalysisResponse>(
    `/api/engines/${engineId}/vibration/ingest`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

/**
 * Resolves the WebSocket streaming URL dynamically from environment or origin.
 */
export function resolveWebSocketUrl(path: string = '/ws/telemetry'): string {
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.VITE_WS_BASE_URL === 'string' &&
    import.meta.env.VITE_WS_BASE_URL.trim() !== ''
  ) {
    const base = import.meta.env.VITE_WS_BASE_URL.trim().replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : '/' + path}`;
  }

  // If running in browser on Vercel (*.vercel.app), serverless does not support persistent WebSockets.
  // Return empty string to gracefully rely on HTTP polling sync without console errors.
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app')) {
    return '';
  }

  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    const wsProto = API_BASE_URL.startsWith('https://') ? 'wss://' : 'ws://';
    const host = API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `${wsProto}${host}${path.startsWith('/') ? path : '/' + path}`;
  }

  if (typeof window !== 'undefined') {
    const wsProto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    return `${wsProto}${window.location.host}${path.startsWith('/') ? path : '/' + path}`;
  }

  return `ws://127.0.0.1:8000${path}`;
}

/**
 * Set server-owned simulation scenario (EARLY_BEARING_WEAR, SENSOR_DRIFT, etc.).
 */
export async function setSimulationScenario(engineId: number, scenario: string) {
  return apiRequest<{ status: string; scenario: string; candidate_fault: string; severity: string }>(
    '/api/simulation/scenario',
    {
      method: 'POST',
      body: JSON.stringify({ engine_id: engineId, scenario }),
    },
  );
}

/**
 * Set server-owned simulation flight phase (TAKEOFF, CLIMB, CRUISE, LANDING).
 */
export async function setSimulationPhase(engineId: number, phase: string) {
  return apiRequest<{ status: string; phase: string }>(
    '/api/simulation/phase',
    {
      method: 'POST',
      body: JSON.stringify({ engine_id: engineId, phase }),
    },
  );
}

/**
 * Get current simulation frame and diagnosis from backend.
 */
export async function getSimulationState(engineId: number = 1) {
  return apiRequest<{ status: string; frame: any; diagnosis: any }>(
    `/api/simulation/state?engine_id=${engineId}`,
  );
}

/**
 * Get full multi-stage System Trace explaining the complete engineering inference chain.
 */
export async function getSystemTrace(engineId: number = 1) {
  return apiRequest<{ engine_id: number; scenario: string; trace: any[]; timestamp: string }>(
    `/api/simulation/system-trace?engine_id=${engineId}`,
  );
}
