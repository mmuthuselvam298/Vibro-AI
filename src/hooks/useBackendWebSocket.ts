import { useEffect, useRef, useCallback } from 'react';
import { resolveWebSocketUrl } from '@/lib/api/client';
import { useBackendEngineStore } from '@/store/backendEngineStore';
import { useEngineStore, type ScenarioType } from '@/store/engineStore';
import { useSignalStore, type DataPoint } from '@/store/signalStore';
import type { EngineStateWebSocketMessage } from '@/lib/api/types';

export function useBackendWebSocket(enabled: boolean = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const sendCommand = useCallback((command: { action: string; [key: string]: any }) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(command));
    }
  }, []);

  const changeScenarioOnServer = useCallback((newScenario: ScenarioType) => {
    sendCommand({ action: 'set_scenario', scenario: newScenario });
  }, [sendCommand]);

  const changePhaseOnServer = useCallback((phase: string) => {
    sendCommand({ action: 'set_phase', phase });
  }, [sendCommand]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    function connect() {
      if (!isMountedRef.current) return;

      const url = resolveWebSocketUrl('/ws/telemetry?engine_id=1');
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMountedRef.current) return;
          useBackendEngineStore.setState({ backendConnected: true, error: null });
        };

        ws.onmessage = (event) => {
          if (!isMountedRef.current) return;
          try {
            const data: EngineStateWebSocketMessage = JSON.parse(event.data);
            if (data.type === 'engine_state') {
              const diag = data.diagnosis;
              const tel = data.telemetry;

              // 1. Update authoritative engineStore
              useEngineStore.setState((prev) => ({
                scenario: (data.scenario as ScenarioType) || prev.scenario,
                engineHealth: diag.health_score,
                faultType: diag.raw_fault_code,
                severity: diag.severity as any,
                confidence: Math.round(diag.confidence * 100),
                rul: diag.rul_cycles,
                degradationRate: diag.degradation_rate_per_100_cycles,
                affectedComponent: diag.affected_component as any,
                alertStatus:
                  diag.severity === 'NOMINAL'
                    ? 'NOMINAL'
                    : diag.severity === 'HIGH' || diag.severity === 'CRITICAL'
                    ? 'CRITICAL'
                    : 'WARNING',
                fusionSummary:
                  diag.evidence.primary.length > 0
                    ? `${diag.candidate_fault}: ${diag.evidence.primary[0]}`
                    : diag.candidate_fault,
                maintenanceAction: diag.recommended_action,
                telemetry: {
                  rpm: { ...prev.telemetry.rpm, current: tel.rpm, expected: tel.expected_rpm },
                  cht: { ...prev.telemetry.cht, current: tel.cht, expected: tel.expected_cht },
                  egt: { ...prev.telemetry.egt, current: tel.egt, expected: tel.expected_egt },
                  oilPressure: {
                    ...prev.telemetry.oilPressure,
                    current: tel.oil_pressure,
                    expected: tel.expected_oil_pressure,
                  },
                  oilTemp: { ...prev.telemetry.oilTemp, current: tel.oil_temp, expected: tel.expected_oil_temp },
                  fuelFlow: { ...prev.telemetry.fuelFlow, current: tel.fuel_flow, expected: tel.expected_fuel_flow },
                  vibrationRms: {
                    ...prev.telemetry.vibrationRms,
                    current: tel.vibration_rms,
                    expected: tel.expected_vibration_rms,
                  },
                  batteryVoltage: { ...prev.telemetry.batteryVoltage, current: tel.battery_voltage },
                  injectionTiming: { ...prev.telemetry.injectionTiming, current: tel.injection_timing },
                },
              }));

              // 2. Update authoritative signalStore waveform & DSP features
              if (data.vibration && Array.isArray(data.vibration.samples)) {
                const samples = data.vibration.samples;
                const dt = 1.0 / (data.vibration.sampling_rate_hz || 1024);
                const waveform: DataPoint[] = samples.map((val, idx) => ({
                  time: Number((idx * dt).toFixed(4)),
                  value: val,
                }));

                const dsp = diag.dsp_metrics || {};

                useSignalStore.setState({
                  waveform,
                  features: {
                    rms: dsp.rms || tel.vibration_rms,
                    peakAmplitude: dsp.peak || 1.25,
                    crestFactor: dsp.crest_factor || 1.45,
                    kurtosis: dsp.kurtosis || 3.0,
                    skewness: dsp.skewness || 0.0,
                    highFreqEnergyRatio: dsp.high_freq_energy_ratio || 0.08,
                    dominantFrequency: diag.dominant_frequency_hz || 60,
                  },
                  timeFeatures: {
                    rms: dsp.rms || tel.vibration_rms,
                    peak: dsp.peak || 1.25,
                    peakToPeak: dsp.peak_to_peak || 2.45,
                    crestFactor: dsp.crest_factor || 1.45,
                    kurtosis: dsp.kurtosis || 3.0,
                    skewness: dsp.skewness || 0.0,
                    mean: dsp.mean || 0.0,
                    stdDev: dsp.std_dev || 0.85,
                  },
                  spectralFeatures: {
                    dominantFrequency: diag.dominant_frequency_hz || 60,
                    spectralEnergy: dsp.spectral_energy || 1200,
                    harmonicEnergy1X: dsp.harmonic_energy_1x || 90,
                    harmonicEnergy2X: dsp.harmonic_energy_2x || 30,
                    harmonicEnergy4X: dsp.harmonic_energy_4x || 15,
                    bpfoBandEnergy: dsp.bpfo_band_energy || 8,
                    bsfBandEnergy: dsp.bsf_band_energy || 6,
                    highFreqEnergyRatio: dsp.high_freq_energy_ratio || 0.08,
                  },
                });
              }

              useBackendEngineStore.setState({
                lastUpdated: new Date().toISOString(),
                backendConnected: true,
              });
            }
          } catch {
            // Ignore non-json or malformed frames
          }
        };

        ws.onclose = () => {
          if (!isMountedRef.current) return;
          useBackendEngineStore.setState({ backendConnected: false });
          // Schedule reconnect attempt
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          if (!isMountedRef.current) return;
          useBackendEngineStore.setState({ backendConnected: false });
        };
      } catch {
        useBackendEngineStore.setState({ backendConnected: false });
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled]);

  return {
    sendCommand,
    changeScenarioOnServer,
    changePhaseOnServer,
  };
}
