import { useEngineStore } from '@/store/engineStore';
import { useSignalStore } from '@/store/signalStore';
import { ingestTelemetry, ingestVibrationBurst } from './client';
import type {
  TelemetryIngest,
  TelemetryIngestResponse,
  VibrationBurstIngest,
  VibrationAnalysisResponse,
} from './types';

/**
 * Configurable synchronization intervals in milliseconds.
 * Read from Vite environment variables with sensible research demonstrator defaults.
 */
export const DEFAULT_TELEMETRY_SYNC_INTERVAL_MS =
  Number(
    typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_BACKEND_SYNC_INTERVAL_MS,
  ) || 2000;

export const DEFAULT_VIBRATION_SYNC_INTERVAL_MS =
  Number(
    typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_BACKEND_VIBRATION_SYNC_INTERVAL_MS,
  ) || 4000;

/**
 * Maps current frontend engine store simulation parameters into the
 * strict backend TelemetryIngest schema.
 */
export function buildTelemetryPayload(engineId: number): TelemetryIngest {
  const engineState = useEngineStore.getState();
  const t = engineState.telemetry;

  // Map alert status to backend status vocabulary
  let mappedStatus = 'NORMAL';
  if (engineState.alertStatus === 'WARNING') {
    mappedStatus = 'WATCH';
  } else if (engineState.alertStatus === 'CRITICAL') {
    mappedStatus = 'CRITICAL';
  }

  return {
    engine_id: engineId,
    mission_id: null,
    timestamp: new Date().toISOString(),
    mission_time_seconds: Math.max(0, engineState.missionTimeSeconds || 0),
    operating_cycle: Math.max(0, engineState.operatingCycle || 0),

    // Core sensor measurements
    rpm: t.rpm.current,
    cht: t.cht.current,
    egt: t.egt.current,
    oil_pressure: t.oilPressure.current,
    oil_temp: t.oilTemp.current,
    fuel_flow: t.fuelFlow.current,
    vibration_rms: t.vibrationRms.current,
    battery_voltage: t.batteryVoltage.current,
    injection_timing: t.injectionTiming.current,

    // Physics baseline expected values
    expected_rpm: t.rpm.expected,
    expected_cht: t.cht.expected,
    expected_egt: t.egt.expected,
    expected_oil_pressure: t.oilPressure.expected,
    expected_oil_temp: t.oilTemp.expected,
    expected_fuel_flow: t.fuelFlow.expected,
    expected_vibration_rms: t.vibrationRms.expected,

    status: mappedStatus,
  };
}

/**
 * Extracts the current bounded vibration waveform buffer from the signal store
 * into the strict backend VibrationBurstIngest schema.
 * Sends bounded 512-sample power-of-2 windows suitable for FFT/DSP processing.
 */
export function buildVibrationPayload(_engineId?: number): VibrationBurstIngest | null {
  const signalState = useSignalStore.getState();
  const engineState = useEngineStore.getState();

  const waveform = signalState.waveform;
  if (!waveform || waveform.length < 16) {
    return null;
  }

  // Extract raw acceleration float samples in g from the existing simulation buffer
  const samples = waveform.map((pt) => pt.value);

  return {
    timestamp: new Date().toISOString(),
    sampling_rate_hz: 1024,
    rpm: engineState.telemetry.rpm.current,
    mission_id: null,
    axis: 'Z',
    trigger_reason: 'PERIODIC',
    is_simulated: true,
    samples,
  };
}

/**
 * Execute a single telemetry synchronization request to the backend.
 */
export async function syncTelemetry(engineId: number): Promise<TelemetryIngestResponse> {
  const payload = buildTelemetryPayload(engineId);
  return ingestTelemetry(payload);
}

/**
 * Execute a single vibration burst synchronization request to the backend.
 * Returns null if current simulation buffer does not have sufficient samples.
 */
export async function syncVibration(
  engineId: number,
): Promise<VibrationAnalysisResponse | null> {
  const payload = buildVibrationPayload(engineId);
  if (!payload) {
    return null;
  }
  return ingestVibrationBurst(engineId, payload);
}
