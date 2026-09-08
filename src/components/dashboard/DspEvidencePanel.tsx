import React from 'react';
import { Cpu, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useSignalStore } from '@/store/signalStore';
import { useEngineStore } from '@/store/engineStore';
import { useBackendEngineState } from '@/hooks/useBackendEngineState';
import { cn } from '@/lib/utils';

export const DspEvidencePanel: React.FC = () => {
  const { timeFeatures, spectralFeatures } = useSignalStore();
  const { scenario } = useEngineStore();
  const { backendConnected } = useBackendEngineState();

  // Baseline nominal values at 3600 RPM cruise
  const baseline = {
    rms: 0.82,
    kurtosis: 3.0,
    crestFactor: 1.45,
    hfEnergyRatio: 0.08,
    bpfoEnergy: 8.0,
    bsfEnergy: 6.0,
  };

  // Measured current values
  const current = {
    rms: timeFeatures.rms || 0.82,
    kurtosis: timeFeatures.kurtosis || 3.0,
    crestFactor: timeFeatures.crestFactor || 1.45,
    hfEnergyRatio: spectralFeatures.highFreqEnergyRatio || 0.08,
    bpfoEnergy: spectralFeatures.bpfoBandEnergy || 8.0,
  };

  // Calculate true observed percentage changes vs healthy baseline
  const calcPct = (curr: number, base: number) => {
    if (base <= 0) return 0;
    const pct = ((curr - base) / base) * 100;
    return Math.round(pct);
  };

  const deltaRms = calcPct(current.rms, baseline.rms);
  const deltaKurtosis = calcPct(current.kurtosis, baseline.kurtosis);
  const deltaCrest = calcPct(current.crestFactor, baseline.crestFactor);
  const deltaHf = calcPct(current.hfEnergyRatio, baseline.hfEnergyRatio);
  const deltaBpfo = calcPct(current.bpfoEnergy, baseline.bpfoEnergy);

  const metrics = [
    {
      label: 'VIBRATION RMS',
      category: 'OBSERVED',
      currentVal: `${current.rms.toFixed(2)} g`,
      baselineVal: `${baseline.rms.toFixed(2)} g`,
      deltaPct: deltaRms,
      description: 'Overall broadband acceleration energy',
      alert: deltaRms > 25,
    },
    {
      label: 'KURTOSIS (4TH MOMENT)',
      category: 'DERIVED',
      currentVal: current.kurtosis.toFixed(2),
      baselineVal: baseline.kurtosis.toFixed(2),
      deltaPct: deltaKurtosis,
      description: 'Sensitivity to non-Gaussian transient shock pulses',
      alert: deltaKurtosis > 20,
    },
    {
      label: 'CREST FACTOR',
      category: 'DERIVED',
      currentVal: current.crestFactor.toFixed(2),
      baselineVal: baseline.crestFactor.toFixed(2),
      deltaPct: deltaCrest,
      description: 'Peak-to-RMS impulsive ratio',
      alert: deltaCrest > 20,
    },
    {
      label: 'HIGH-FREQ ENERGY RATIO',
      category: 'DERIVED',
      currentVal: `${(current.hfEnergyRatio * 100).toFixed(1)}%`,
      baselineVal: `${(baseline.hfEnergyRatio * 100).toFixed(1)}%`,
      deltaPct: deltaHf,
      description: 'Acoustic / structural ringing band ratio',
      alert: deltaHf > 35,
    },
    {
      label: 'BPFO DEFECT BAND',
      category: 'CANDIDATE',
      currentVal: `${current.bpfoEnergy.toFixed(1)}`,
      baselineVal: `${baseline.bpfoEnergy.toFixed(1)}`,
      deltaPct: deltaBpfo,
      description: 'Candidate outer-race kinematic pass frequency (~150 Hz)',
      alert: deltaBpfo > 50,
    },
  ];

  return (
    <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-700 text-white">
            <Cpu size={16} />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black uppercase tracking-tight m-0">
              DSP Evidence Panel <span className="text-neutral-400 font-normal">|</span> Baseline Residual Breakdown
            </h3>
            <p className="text-[11px] font-mono text-neutral-600 m-0">
              Deterministic mathematical residuals computed by Radix-2 FFT & statistical moment analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-black bg-neutral-100 text-black">
            PROVENANCE: {backendConnected ? 'FASTAPI AUTHORITATIVE' : 'LOCAL FFT REPLICA'}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {metrics.map((m, idx) => {
          const isElevated = m.deltaPct > 10;
          const isSignificant = m.alert;

          return (
            <div
              key={idx}
              className={cn(
                "p-3 border-2 border-black flex flex-col justify-between transition-all",
                isSignificant
                  ? "bg-amber-50 shadow-[2px_2px_0px_0px_#f59e0b]"
                  : "bg-neutral-50 shadow-[1px_1px_0px_0px_#000]"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[9px] font-mono font-bold px-1 py-0.2 border border-black bg-white text-neutral-700">
                    {m.category}
                  </span>
                  {isSignificant ? (
                    <ShieldAlert size={13} className="text-amber-600" />
                  ) : (
                    <CheckCircle2 size={13} className="text-emerald-600" />
                  )}
                </div>

                <div className="text-[11px] font-black uppercase leading-tight truncate">
                  {m.label}
                </div>
                <div className="text-[9px] font-mono text-neutral-600 leading-tight mt-0.5">
                  {m.description}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-neutral-300 flex items-end justify-between font-mono">
                <div>
                  <div className="text-[9px] text-neutral-500 uppercase">Current / Base</div>
                  <div className="text-xs font-bold text-black">
                    {m.currentVal} <span className="text-neutral-400 font-normal">/</span> {m.baselineVal}
                  </div>
                </div>

                <div className={cn(
                  "text-xs font-black px-1.5 py-0.5 border border-black flex items-center gap-0.5",
                  isElevated
                    ? "bg-amber-400 text-black"
                    : "bg-emerald-100 text-emerald-900"
                )}>
                  {m.deltaPct >= 0 ? `+${m.deltaPct}%` : `${m.deltaPct}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Notes */}
      <div className="mt-3 pt-2 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-neutral-600">
        <div>
          <span className="font-bold text-black">Active Scenario:</span> {scenario.replace(/_/g, ' ')}
        </div>
        <div>
          * Residuals calculated in real time against baseline rotational kinematic envelope.
        </div>
      </div>
    </div>
  );
};
