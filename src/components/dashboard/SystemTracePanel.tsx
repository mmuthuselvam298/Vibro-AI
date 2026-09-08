import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  BrainCircuit,
  HeartPulse,
  Clock,
  ShieldCheck,
  Database,
  Radio,
} from 'lucide-react';
import { useBackendEngineState } from '@/hooks/useBackendEngineState';
import { useEngineStore } from '@/store/engineStore';
import { getSystemTrace } from '@/lib/api/client';
import type { SystemTraceStep } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export const SystemTracePanel: React.FC = () => {
  const { backendConnected } = useBackendEngineState();
  const { scenario, engineHealth, rul, faultType, severity, alertStatus } = useEngineStore();
  const [traceSteps, setTraceSteps] = useState<SystemTraceStep[]>([]);
  const [activeStep, setActiveStep] = useState<number>(3);

  // Poll or refresh system trace when backend is active
  useEffect(() => {
    let isMounted = true;

    async function fetchTrace() {
      if (!backendConnected) {
        return;
      }
      try {
        const data = await getSystemTrace(1);
        if (isMounted && data && Array.isArray(data.trace)) {
          setTraceSteps(data.trace);
        }
      } catch {
        // Handled gracefully
      }
    }

    fetchTrace();
    const interval = setInterval(fetchTrace, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [backendConnected, scenario]);

  // Client fallback trace when offline
  const displaySteps: SystemTraceStep[] =
    traceSteps.length === 8
      ? traceSteps
      : [
          {
            step: 1,
            stage: 'SENSOR',
            title: 'ADXL355 Accelerometer Waveform',
            detail: '512 samples @ 1024 Hz, 3-Axis vibration acquisition',
            status: 'ACQUIRING',
            source: 'ADXL355 / Client Simulation Stream',
          },
          {
            step: 2,
            stage: 'DSP',
            title: 'Fourier Spectrum & Moments',
            detail: 'Radix-2 FFT, Hann Window, Kurtosis, Crest Factor, Sub-Bands',
            status: 'COMPUTED',
            source: 'Radix-2 FFT Engine',
          },
          {
            step: 3,
            stage: 'INTELLIGENCE',
            title: 'Multi-Evidence Synthesis',
            detail: `${faultType.replace(/_/g, ' ')} (${severity})`,
            status: severity,
            source: 'Physics Baseline + ML Random Forest',
          },
          {
            step: 4,
            stage: 'HEALTH',
            title: 'Subsystem Health Aggregation',
            detail: `Overall Score: ${engineHealth}% (${alertStatus})`,
            status: alertStatus,
            source: 'Multi-Subsystem Health Aggregator',
          },
          {
            step: 5,
            stage: 'RUL',
            title: 'Prototype Operating Margin',
            detail: `~${rul} Operating Cycles Remaining Margin`,
            status: 'ESTIMATE',
            source: 'Deterministic Trend Engine',
          },
          {
            step: 6,
            stage: 'DIGITAL_TWIN',
            title: 'Digital Twin Subsystem Map',
            detail: 'Bearing & Crankcase Subsystems Synchronized',
            status: severity,
            source: 'FastAPI Digital Twin State',
          },
          {
            step: 7,
            stage: 'MISSION',
            title: 'Mission Phase Reliability',
            detail: severity === 'NOMINAL' ? 'Nominal risk profile' : 'Elevated dynamic thrust review required',
            status: severity === 'NOMINAL' ? 'NOMINAL' : 'WATCH',
            source: 'Contextual Flight Rules',
          },
          {
            step: 8,
            stage: 'DECISION_SUPPORT',
            title: 'Maintenance Advisory',
            detail: severity === 'NOMINAL' ? 'Continue standard scheduled turnaround' : 'Priority raceway boroscope inspection',
            status: severity === 'NOMINAL' ? 'NOMINAL' : 'ACTION_REQUIRED',
            source: 'Decision Support Rulebook',
          },
        ];

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'SENSOR':
        return <Activity size={14} className="text-blue-600" />;
      case 'DSP':
        return <Cpu size={14} className="text-purple-600" />;
      case 'INTELLIGENCE':
        return <BrainCircuit size={14} className="text-amber-600" />;
      case 'HEALTH':
        return <HeartPulse size={14} className="text-red-600" />;
      case 'RUL':
        return <Clock size={14} className="text-emerald-600" />;
      case 'DIGITAL_TWIN':
        return <Database size={14} className="text-indigo-600" />;
      case 'MISSION':
        return <Radio size={14} className="text-cyan-600" />;
      default:
        return <ShieldCheck size={14} className="text-black" />;
    }
  };

  return (
    <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000]">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-black text-white">
            <BrainCircuit size={16} />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-black uppercase tracking-tight m-0">
              End-to-End System Trace <span className="text-neutral-400 font-normal">|</span> Engineering Inference Chain
            </h2>
            <p className="text-[11px] font-mono text-neutral-600 m-0">
              Deterministic propagation: Sensor Signal → DSP Moments → ML/Physics Diagnosis → Digital Twin → Decision Support
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-black bg-amber-100 text-amber-950">
            {backendConnected ? 'FASTAPI BACKEND STREAM' : 'LOCAL SIMULATOR PROJECTION'}
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-black bg-black text-white">
            8-STAGE PIPELINE
          </span>
        </div>
      </div>

      {/* 8-Stage Pipeline Progression Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-3">
        {displaySteps.map((step) => {
          const isSelected = activeStep === step.step;
          return (
            <button
              key={step.step}
              onClick={() => setActiveStep(step.step)}
              className={cn(
                "p-2 text-left border-2 border-black transition-all flex flex-col justify-between min-h-[76px]",
                isSelected
                  ? "bg-black text-white shadow-[2px_2px_0px_0px_#f59e0b] -translate-y-0.5"
                  : "bg-neutral-50 hover:bg-neutral-100 text-black shadow-[1px_1px_0px_0px_#000]"
              )}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-mono font-bold opacity-80">#{step.step}</span>
                {getStageIcon(step.stage)}
              </div>
              <div className="text-[11px] font-extrabold uppercase leading-tight truncate">
                {step.stage.replace('_', ' ')}
              </div>
              <div className="text-[9px] font-mono truncate opacity-90 mt-0.5">
                {step.status}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Stage Detailed Breakdown */}
      {displaySteps[activeStep - 1] && (
        <div className="p-3 border-2 border-black bg-neutral-100 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 border border-black bg-white shrink-0 mt-0.5">
              {getStageIcon(displaySteps[activeStep - 1].stage)}
            </div>
            <div>
              <div className="font-black uppercase text-black text-xs md:text-sm">
                Stage {activeStep}: {displaySteps[activeStep - 1].title}
              </div>
              <div className="text-neutral-800 text-[11px] mt-0.5">
                {displaySteps[activeStep - 1].detail}
              </div>
            </div>
          </div>

          <div className="sm:text-right shrink-0">
            <div className="text-[10px] text-neutral-500 uppercase font-bold">Trace Provenance</div>
            <div className="text-[11px] font-bold text-blue-900 truncate max-w-[280px]">
              {displaySteps[activeStep - 1].source}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
