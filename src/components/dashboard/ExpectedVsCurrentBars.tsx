import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { computeAdaptiveBaseline, type BaselineParamResult, type DeviationStatus } from '@/lib/physicsBaseline';
import { GuideLink } from './GuideLink';
import { JargonTooltip } from './JargonTooltip';
import { ArrowUpRight, ArrowDownRight, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ExpectedVsCurrentBars: React.FC = () => {
  const {
    telemetry,
    missionProfile,
    setMissionProfile,
  } = useEngineStore();

  // Compute live adaptive baseline and residuals dynamically
  const baselineResult = React.useMemo(() => {
    return computeAdaptiveBaseline(
      {
        rpm: telemetry.rpm.current,
        cht: telemetry.cht.current,
        egt: telemetry.egt.current,
        oilPressure: telemetry.oilPressure.current,
        oilTemp: telemetry.oilTemp.current,
        fuelFlow: telemetry.fuelFlow.current,
        vibrationRms: telemetry.vibrationRms.current,
      },
      missionProfile
    );
  }, [telemetry, missionProfile]);

  const { overallDeviationScore, overallStatus, parameters, environmentalOffsets } = baselineResult;

  const paramList: BaselineParamResult[] = [
    parameters.vibrationRms,
    parameters.rpm,
    parameters.oilPressure,
    parameters.oilTemp,
    parameters.cht,
    parameters.egt,
    parameters.fuelFlow,
  ];

  const getStatusBadge = (status: DeviationStatus) => {
    switch (status) {
      case 'CRITICAL':
        return 'bg-[var(--color-brand-red)] text-white border-black';
      case 'ANOMALY':
        return 'bg-orange-500 text-white border-black';
      case 'WATCH':
        return 'bg-[var(--color-brand-yellow)] text-black border-black';
      case 'NORMAL':
      default:
        return 'bg-[var(--color-brand-green)] text-black border-black';
    }
  };

  const getStatusColor = (status: DeviationStatus) => {
    switch (status) {
      case 'CRITICAL':
        return 'bg-[var(--color-brand-red)]';
      case 'ANOMALY':
        return 'bg-orange-500';
      case 'WATCH':
        return 'bg-[var(--color-brand-yellow)]';
      case 'NORMAL':
      default:
        return 'bg-[var(--color-brand-green)]';
    }
  };

  // Helper to normalize bar width (0 to 100%) against parameter range
  const calculateBarWidth = (val: number, min: number, max: number) => {
    const range = max - min || 1;
    const clamped = Math.max(min, Math.min(max, val));
    return Math.min(100, Math.max(4, ((clamped - min) / range) * 100));
  };

  return (
    <div className="neo-card bg-white border-4 border-black p-5 flex flex-col gap-5 shadow-[4px_4px_0px_0px_#000]">
      {/* Top Banner: Core Principle & Prominent Overall Deviation Score */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-4 border-black pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-black text-white px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest">
              CORE INNOVATION (SIH26054)
            </span>
            <span className="text-xs font-mono font-bold text-gray-500 hidden sm:inline">
              PHYSICS-INFORMED ADAPTIVE REFERENCE
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight mt-1">
            Expected Healthy State <span className="text-gray-400">VS</span> Current Live Engine
          </h2>
          <p className="text-xs font-mono text-gray-600 mt-1 max-w-2xl">
            <strong>&quot;We don&apos;t wait for a parameter to become dangerous. We detect when the engine stops behaving like a healthy engine.&quot;</strong> Baseline dynamically adapts to flight profile, throttle load, and ambient atmosphere.
          </p>
        </div>

        {/* Prominent Overall Deviation Score KPI Gauge */}
        <div className="flex items-center gap-4 bg-[var(--color-brand-light)] border-4 border-black p-3 sm:p-4 shrink-0 shadow-[2px_2px_0px_0px_#000]">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-gray-600 block leading-tight">
              OVERALL DEVIATION SCORE
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tighter">
                {overallDeviationScore.toFixed(1)}%
              </span>
              <span className={cn(
                "text-[10px] font-extrabold font-mono px-2 py-0.5 border-2",
                getStatusBadge(overallStatus)
              )}>
                {overallStatus}
              </span>
            </div>
            <div className="text-[9px] font-mono text-gray-500 mt-1">
              0-10% NOMINAL • 10-25% WATCH • 25-50% ANOMALY • 50%+ CRITICAL
            </div>
          </div>
          <GuideLink sectionId="03-system-architecture" label="Baseline Guide" />
        </div>
      </div>

      {/* Dynamic Profile Context Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-neutral-100 border-2 border-black font-mono text-xs">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-black shrink-0" />
          <span className="font-bold text-black uppercase">Adaptive Reference Envelope:</span>
          <span className="text-gray-700">{environmentalOffsets.activeProfileDescription}</span>
        </div>

        {/* Profile Switcher Quick Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase mr-1">Profile:</span>
          {(['ENDURANCE_CRUISE', 'HOT_WEATHER', 'HIGH_ALTITUDE', 'RAPID_THROTTLE'] as const).map((p) => {
            const isSel = missionProfile === p;
            const labels: Record<string, string> = {
              ENDURANCE_CRUISE: 'Cruise (ISA)',
              HOT_WEATHER: 'Hot (+45°C)',
              HIGH_ALTITUDE: 'FL150 Altitude',
              RAPID_THROTTLE: 'High-G Throttle'
            };
            return (
              <button
                key={p}
                onClick={() => setMissionProfile(p)}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold border transition-all",
                  isSel
                    ? "bg-black text-white border-black shadow-[1px_1px_0px_0px_#000]"
                    : "bg-white text-gray-700 hover:bg-gray-200 border-black"
                )}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dual Comparison Bars Grid: 7 Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paramList.map((param) => {
          const expectedBarWidth = calculateBarWidth(param.expected, param.nominalMin, param.nominalMax);
          const currentBarWidth = calculateBarWidth(param.current, param.nominalMin, param.nominalMax);
          const isPos = param.deviationPercent > 0;
          const isZero = param.deviationPercent === 0;

          const getPlainSubtitle = (label: string) => {
            if (label.includes('Vibration')) return 'How much the engine is shaking — catches mechanical knocks early';
            if (label.includes('RPM')) return 'How fast the shaft is spinning — steady governor speed check';
            if (label.includes('Pressure')) return 'Oil lubrication pressure — protects bearings from metal rubbing';
            if (label.includes('Oil Sump')) return 'Oil heat — rises when journal friction increases';
            if (label.includes('Cylinder Head')) return 'Cylinder temperature — reveals cooling or overheating stress';
            if (label.includes('Exhaust')) return 'Exhaust heat — reveals fuel combustion or injector issues';
            if (label.includes('Fuel')) return 'Fuel burn rate — catches injector clogging and excess drag';
            return param.physicsContext;
          };

          return (
            <div
              key={param.label}
              className={cn(
                "p-3.5 border-2 border-black bg-white flex flex-col justify-between gap-2.5 transition-all shadow-[var(--shadow-neobrutalism-sm)]",
                param.status === 'CRITICAL' && "bg-red-50/50 border-red-600",
                param.status === 'ANOMALY' && "bg-orange-50/40"
              )}
            >
              {/* Header: Label + Status Pill */}
              <div className="flex items-start justify-between gap-2 border-b border-gray-200 pb-1.5">
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-sm uppercase tracking-tight text-black">
                      {param.label}
                    </span>
                    <JargonTooltip
                      term={param.label}
                      explanation={getPlainSubtitle(param.label)}
                      technicalDetails={param.physicsContext}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-neutral-600 leading-tight mt-0.5">
                    {getPlainSubtitle(param.label)}
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-extrabold font-mono px-2 py-0.5 border border-black uppercase shrink-0",
                  getStatusBadge(param.status)
                )}>
                  {param.status}
                </span>
              </div>

              {/* DUAL COMPARISON BARS */}
              <div className="space-y-2 font-mono text-xs">
                {/* BAR 1: EXPECTED HEALTHY BASELINE */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-600 mb-0.5">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-none bg-neutral-600 inline-block border border-black"></span>
                      HEALTHY EXPECTED (f(Env, Load)):
                    </span>
                    <span className="text-black font-extrabold">
                      {param.expected} {param.unit}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 h-3 border-2 border-black relative overflow-hidden">
                    <div
                      className="h-full bg-neutral-500 transition-all duration-300"
                      style={{ width: `${expectedBarWidth}%` }}
                    />
                    {/* Expected Reference Marker Notch */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-black z-10 -ml-0.5"
                      style={{ left: `${expectedBarWidth}%` }}
                      title={`Target: ${param.expected} ${param.unit}`}
                    />
                  </div>
                </div>

                {/* BAR 2: CURRENT LIVE ENGINE */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-bold mb-0.5">
                    <span className="flex items-center gap-1 text-black font-extrabold">
                      <span className={cn("w-2 h-2 rounded-none inline-block border border-black", getStatusColor(param.status))}></span>
                      CURRENT LIVE ENGINE:
                    </span>
                    <span className="font-extrabold text-black">
                      {param.current} {param.unit}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 h-3.5 border-2 border-black relative overflow-hidden">
                    <div
                      className={cn("h-full transition-all duration-300", getStatusColor(param.status))}
                      style={{ width: `${currentBarWidth}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer: Residual & Normalized Deviation % */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 font-mono text-xs">
                <div className="text-[10px] text-gray-500">
                  RESIDUAL: <strong className="text-black">{param.residual > 0 ? `+${param.residual}` : param.residual} {param.unit}</strong>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-gray-500">DEVIATION:</span>
                  <span className={cn(
                    "font-extrabold text-xs flex items-center",
                    param.status === 'CRITICAL' ? "text-red-700" :
                    param.status === 'ANOMALY' ? "text-orange-600" :
                    param.status === 'WATCH' ? "text-amber-700" : "text-emerald-700"
                  )}>
                    {isZero ? (
                      <Minus size={13} />
                    ) : isPos ? (
                      <ArrowUpRight size={14} className="stroke-[3]" />
                    ) : (
                      <ArrowDownRight size={14} className="stroke-[3]" />
                    )}
                    {isPos ? `+${param.deviationPercent}%` : `${param.deviationPercent}%`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
