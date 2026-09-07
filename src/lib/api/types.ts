/**
 * Typed response contracts matching the FastAPI / SQLModel backend.
 * All types mirror backend Pydantic schemas without unsupported additions.
 */

export interface BackendHealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface Engine {
  id: number;
  uav_id: string | null;
  engine_model: string;
  serial_number: string;
  health_score: number;
  status: string;
  total_runtime_hours: number;
  total_operating_cycles: number;
  is_simulated: boolean;
  installation_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TelemetryIngest {
  engine_id: number;
  mission_id?: number | null;
  timestamp?: string | null;
  mission_time_seconds?: number;
  operating_cycle?: number;
  rpm: number;
  cht: number;
  egt: number;
  oil_pressure: number;
  oil_temp: number;
  fuel_flow: number;
  vibration_rms: number;
  battery_voltage?: number;
  injection_timing?: number;
  expected_rpm?: number | null;
  expected_cht?: number | null;
  expected_egt?: number | null;
  expected_oil_pressure?: number | null;
  expected_oil_temp?: number | null;
  expected_fuel_flow?: number | null;
  expected_vibration_rms?: number | null;
  overall_deviation_score?: number | null;
  status?: string;
  alternator_health?: number | null;
  ambient_temp?: number | null;
  altitude_ft?: number | null;
  throttle_position?: number | null;
  aux_pressure_bar?: number | null;
  aux_temp_c?: number | null;
}

export interface TelemetryIngestResponse {
  status: string;
  persisted_to_db: boolean;
  engine_id: number;
  timestamp: string;
  frame_id: number | null;
  message: string;
}

export interface VibrationBurstIngest {
  timestamp?: string | null;
  sampling_rate_hz?: number;
  rpm?: number | null;
  mission_id?: number | null;
  axis?: string;
  trigger_reason?: string;
  is_simulated?: boolean;
  samples?: number[] | null;
  axis_data?: Record<string, number[]> | null;
}

export interface VibrationAnalysisResponse {
  burst: VibrationBurstRead;
  features: VibrationFeatureRead;
  frequency_bands?: Array<Record<string, unknown>> | null;
  wpd_bands?: Array<Record<string, unknown>> | null;
  spectrum_summary?: Array<Record<string, unknown>> | null;
  processing_metadata?: Record<string, unknown>;
}

export interface SyncStatus {
  enabled: boolean;
  activeEngineId: number | null;
  isTelemetryInFlight: boolean;
  isVibrationInFlight: boolean;
  lastTelemetrySync: string | null;
  lastVibrationSync: string | null;
  lastTelemetryStatus: string | null;
  telemetryPersisted: boolean | null;
  backendConnected: boolean | null;
  lastError: string | null;
}

export interface UseBackendSyncOptions {
  enabled?: boolean;
  engineId?: number | null;
  telemetryIntervalMs?: number;
  vibrationIntervalMs?: number;
}

export interface TelemetryFrameRead {
  id: number | null;
  engine_id: number;
  mission_id: number | null;
  timestamp: string;
  mission_time_seconds: number;
  operating_cycle: number;
  rpm: number;
  cht: number;
  egt: number;
  oil_pressure: number;
  oil_temp: number;
  fuel_flow: number;
  vibration_rms: number;
  battery_voltage: number;
  injection_timing: number;
  expected_rpm: number | null;
  expected_cht: number | null;
  expected_egt: number | null;
  expected_oil_pressure: number | null;
  expected_oil_temp: number | null;
  expected_fuel_flow: number | null;
  expected_vibration_rms: number | null;
  overall_deviation_score: number | null;
  status: string;
  alternator_health: number | null;
  ambient_temp: number | null;
  altitude_ft: number | null;
  throttle_position: number | null;
  aux_pressure_bar: number | null;
  aux_temp_c: number | null;
}

export interface VibrationBurstRead {
  id: number;
  engine_id: number;
  mission_id: number | null;
  timestamp: string;
  sampling_rate_hz: number;
  sample_count: number;
  duration_ms: number;
  axis: string;
  trigger_reason: string;
  rpm: number | null;
  is_simulated: boolean;
  created_at: string;
}

export interface VibrationFeatureRead {
  id: number;
  burst_id: number;
  timestamp: string;
  rms: number;
  peak: number;
  peak_to_peak: number;
  crest_factor: number;
  kurtosis: number;
  skewness: number;
  mean: number;
  std_dev: number;
  dominant_frequency: number;
  spectral_energy: number;
  harmonic_energy_1x: number;
  harmonic_energy_2x: number;
  harmonic_energy_4x: number;
  bpfo_band_energy: number;
  bsf_band_energy: number;
  high_freq_energy_ratio: number;
  wpd_dominant_band: string | null;
  dominant_order: number | null;
  shaft_frequency_hz: number | null;
  candidate_anomaly_indicator: string | null;
}

export interface HealthRecordRead {
  id: number;
  engine_id: number;
  timestamp: string;
  operating_cycle: number;
  health_score: number;
  degradation_rate_per_100c: number;
  upper_bound: number | null;
  lower_bound: number | null;
  is_simulated: boolean;
}

export interface PrognosticSnapshotRead {
  id: number;
  engine_id: number;
  mission_id: number | null;
  timestamp: string;
  rul_nominal_cycles: number;
  rul_min_cycles: number;
  rul_max_cycles: number;
  confidence_percent: number;
  mission_reliability_score: number;
  mission_capability_status: string;
  safe_operation_minutes: number;
  margin_ratio: number;
  recommended_action: string;
  primary_reason: string;
}

export interface FaultEventRead {
  id: number;
  engine_id: number;
  mission_id: number | null;
  timestamp: string;
  fault_code: string;
  fault_title: string;
  affected_component: string;
  severity: string;
  confidence: number;
  evidence_consistency: string;
  evidence_chain_json: string | null;
  evidence: string[] | null;
  fusion_summary: string | null;
  is_acknowledged: boolean;
  resolved_at: string | null;
}

export interface MaintenanceAdvisoryResponse {
  engine_id: number;
  target_component: string;
  urgency: string;
  prescribed_action: string;
  action_type: string;
  advisory_source: string;
  evidence_summary: string | null;
  disclaimer: string;
}

export interface SourceFreshnessInfo {
  status: 'AVAILABLE' | 'STALE' | 'UNAVAILABLE' | string;
  last_timestamp: string | null;
  age_seconds: number | null;
  is_simulated: boolean | null;
  details: string | null;
}

export interface DataFreshnessSummary {
  telemetry: SourceFreshnessInfo;
  vibration: SourceFreshnessInfo;
  faults: SourceFreshnessInfo;
  health_history: SourceFreshnessInfo;
  prognostics: SourceFreshnessInfo;
  mission: SourceFreshnessInfo;
}

export interface SubsystemHealthState {
  subsystem: string;
  status: string;
  health_score: number | null;
  indicators: Record<string, unknown>;
  notes: string | null;
}

export interface HealthTrajectory {
  current_health: number | null;
  previous_health: number | null;
  trend_direction: 'IMPROVING' | 'STABLE' | 'DEGRADING' | 'UNKNOWN' | string;
  delta_health: number | null;
  degradation_rate_per_hour: number | null;
  observation_count: number;
  latest_observation_time: string | null;
  classification_rule: string;
}

export interface ActiveFaultSummary {
  id: number;
  fault_code: string;
  fault_title: string;
  severity: string;
  affected_component: string | null;
  timestamp: string;
  confidence: number | null;
  fusion_summary: string | null;
  is_acknowledged: boolean;
}

export interface PrognosticsContext {
  snapshot_id: number | null;
  timestamp: string | null;
  rul_nominal_cycles: number;
  rul_min_cycles: number | null;
  rul_max_cycles: number | null;
  mission_capability_status: string;
  mission_reliability_score: number;
  safe_operation_minutes: number;
  confidence_percent: number;
  is_simulated: boolean;
}

export interface MissionContext {
  mission_id: number | null;
  mission_code: string | null;
  profile_type: string | null;
  status: string | null;
  planned_duration_seconds: number | null;
  elapsed_seconds: number | null;
  altitude_ft: number | null;
}

export interface ThresholdProfileMetadata {
  profile_name: string;
  classification_type: string;
  description: string;
}

export interface DigitalTwinSnapshotResponse {
  engine_id: number;
  engine_serial_number: string;
  timestamp: string;
  operational_status: string;
  overall_health_score: number;
  state_source: string;
  subsystems: Record<string, SubsystemHealthState>;
  health_trajectory: HealthTrajectory;
  data_freshness: DataFreshnessSummary;
  active_faults: ActiveFaultSummary[];
  prognostics: PrognosticsContext | null;
  mission: MissionContext | null;
  evidence: string[];
  threshold_profile: ThresholdProfileMetadata;
  disclaimer: string;
}

export interface FaultsFilterOptions {
  severity?: string;
  fault_code?: string;
  is_acknowledged?: boolean;
  active_only?: boolean;
  limit?: number;
}
