import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { GuideLink } from './GuideLink';
import { JargonTooltip } from './JargonTooltip';
import { cn } from '@/lib/utils';
import { Activity, AlertTriangle, ShieldAlert, Cpu } from 'lucide-react';

export const HeroMetrics: React.FC = () => {
  const {
    engineHealth,
    faultType,
    severity,
    confidence,
    rul,
    alertStatus,
    plainLanguageMode,
  } = useEngineStore();

  const isHealthy = engineHealth > 85;
  const isWarning = engineHealth <= 85 && engineHealth > 40;
  const isCritical = engineHealth <= 40;

  // Plain-language fault translations for non-specialist judges
  const getPlainFaultName = (rawFault: string) => {
    if (rawFault === 'None (Nominal Operation)') return 'ALL SYSTEMS NORMAL';
    if (rawFault.includes('BPFO') || rawFault.includes('Bearing Outer-Race')) return 'BEARING STARTING TO WEAR OUT';
    if (rawFault.includes('Severe Bearing')) return 'HEAVY BEARING DAMAGE (DANGER)';
    if (rawFault.includes('Piston Slap')) return 'PISTON KNOCKING IN CYLINDER';
    if (rawFault.includes('Valve Lash')) return 'LOOSE VALVE TIMING GAP';
    if (rawFault.includes('Rolling Element') || rawFault.includes('BSF')) return 'DAMAGED BEARING BALL/ROLLER';
    if (rawFault.includes('Misfire')) return 'CYLINDER FAILED TO FIRE (MISFIRE)';
    if (rawFault.includes('Injector')) return 'CLOGGED FUEL INJECTOR';
    if (rawFault.includes('Lubrication')) return 'LOW OIL PRESSURE / LUBRICATION';
    if (rawFault.includes('Overheating')) return 'ENGINE RUNNING TOO HOT';
    if (rawFault.includes('Sensor Drift')) return 'SENSOR GLITCH (ENGINE PHYSICALLY OKAY)';
    if (rawFault.includes('Combustion Instability')) return 'COMBUSTION FLAME KNOCK';
    return rawFault;
  };

  const plainFault = getPlainFaultName(faultType);
  const displayTechnicalFault = faultType === 'None (Nominal Operation)' ? 'Nominal Baseline' : faultType;
  const approxFlightHours = Math.round(rul * 0.45); // ~0.45 hrs per cycle

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

      {/* 1. ENGINE HEALTH */}
      <div className={cn(
        "neo-card flex flex-col justify-between h-48 p-5 transition-all shadow-[4px_4px_0px_0px_#000]",
        isHealthy && "bg-[var(--color-brand-green)] text-black",
        isWarning && "bg-[var(--color-brand-yellow)] text-black",
        isCritical && "bg-[var(--color-brand-red)] text-white"
      )}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold uppercase tracking-wider text-xs">
                {plainLanguageMode ? 'Engine Health' : 'Composite Health'}
              </span>
              <JargonTooltip
                term="Engine Health"
                explanation="Overall physical condition of the engine from 0% (seized/grounded) to 100% (factory new). Weighed across mechanical, thermal, lubrication, and combustion sensors."
                analogy="Like your overall fitness score — drops if blood pressure, temperature, or heart rhythm drifts."
              />
            </div>
            <span className="text-[10px] font-mono opacity-80 block mt-0.5">
              Target: &gt;85% for mission dispatch
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <GuideLink sectionId="09-severity-estimation" label="?" />
            <Activity size={26} className="stroke-[2.5]" />
          </div>
        </div>

        <div>
          <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tighter">
            {engineHealth.toFixed(1)}<span className="text-2xl font-bold">%</span>
          </div>
          <div className="text-xs mt-2 uppercase font-extrabold font-mono tracking-wider pt-1 border-t-2 border-current flex items-center justify-between">
            <span>STATUS: {alertStatus}</span>
            <span className="text-[10px] opacity-85 font-normal">
              {isHealthy ? 'NOMINAL • MONITOR' : isWarning ? 'PRIORITY WATCH' : 'IMMEDIATE REVIEW'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. ACTIVE FAULT / STATE */}
      <div className="neo-card flex flex-col justify-between h-48 p-5 bg-white border-4 border-black shadow-[4px_4px_0px_0px_#000]">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold uppercase tracking-wider text-xs text-gray-600">
                {plainLanguageMode ? "What's Happening" : 'Active Fault Locus'}
              </span>
              <JargonTooltip
                term="Fault Diagnosis"
                explanation="Specific component experiencing wear or degradation, identified by cross-correlating vibration frequencies with temperature and oil pressure."
                technicalDetails="Derived from multi-sensor evidence fusion and ISO 13374 vibration kinematic markers."
              />
            </div>
            <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
              Live candidate indicator
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <GuideLink sectionId="08-fault-signatures" label="?" />
            <AlertTriangle
              size={26}
              className={cn("stroke-[2.5]", plainFault !== 'ALL SYSTEMS NORMAL' ? 'text-black' : 'text-gray-300')}
            />
          </div>
        </div>

        <div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight uppercase line-clamp-1 leading-none mb-1">
            {plainLanguageMode ? plainFault : displayTechnicalFault}
          </div>
          <div className="text-[10px] font-mono text-neutral-500 truncate mb-2">
            {plainLanguageMode ? `Technical: ${displayTechnicalFault}` : 'Corroborated across 9 telemetry channels'}
          </div>

          <div className="flex items-center justify-between pt-1 border-t-2 border-gray-200">
            <span className="text-xs uppercase font-extrabold text-gray-500 font-mono">Severity:</span>
            <span className={cn(
              "text-xs font-extrabold font-mono px-2.5 py-0.5 border-2 border-black",
              severity === 'CRITICAL' ? "bg-[var(--color-brand-red)] text-white" :
              severity === 'HIGH' ? "bg-orange-500 text-white" :
              severity === 'MEDIUM' ? "bg-[var(--color-brand-yellow)] text-black" :
              severity === 'LOW' ? "bg-blue-100 text-black" : "bg-gray-100 text-black"
            )}>
              {severity}
            </span>
          </div>
        </div>
      </div>

      {/* 3. AI CONFIDENCE / EVIDENCE */}
      <div className="neo-card flex flex-col justify-between h-48 p-5 bg-white border-4 border-black shadow-[4px_4px_0px_0px_#000]">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold uppercase tracking-wider text-xs text-gray-600">
                {plainLanguageMode ? 'Evidence Agreement' : 'Pattern Agreement'}
              </span>
              <JargonTooltip
                term="AI Evidence Match"
                explanation="How strongly the sensor readings agree with this specific fault pattern. Evidence agreement metric; not a guaranteed failure probability."
                technicalDetails="Calibrated posterior probability from multi-parameter feature distance engine."
              />
            </div>
            <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
              Multi-sensor agreement metric
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <GuideLink sectionId="07-ai-fault-diagnosis" label="?" />
            <Cpu size={26} className="stroke-[2.5]" />
          </div>
        </div>

        <div>
          <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tighter">
            {confidence.toFixed(1)}<span className="text-2xl font-bold">%</span>
          </div>
          <div className="w-full bg-gray-200 h-3.5 border-2 border-black mt-2 overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-300 ease-out"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-1 flex justify-between">
            <span>PHYSICS CORROBORATED</span>
            <span className="font-bold text-neutral-800">DECISION-SUPPORT</span>
          </div>
        </div>
      </div>

      {/* 4. EST. RUL / TIME LEFT */}
      <div className="neo-card flex flex-col justify-between h-48 p-5 bg-[var(--color-brand-blue)] text-white border-4 border-black shadow-[4px_4px_0px_0px_#000]">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold uppercase tracking-wider text-xs text-gray-300">
                {plainLanguageMode ? 'Estimated Cycles (Prototype)' : 'Prototype RUL Estimate'}
              </span>
              <JargonTooltip
                term="RUL (Remaining Useful Life)"
                explanation="Prototype decision-support estimate of operating cycles remaining before component degradation reaches the 40% threshold. Not a certified airworthiness determination."
                analogy="Like an estimated range gauge, forecasting mechanical wear trends."
              />
            </div>
            <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
              Decision-Support Estimate
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <GuideLink sectionId="10-rul" label="?" />
            <ShieldAlert size={26} className="stroke-[2.5]" />
          </div>
        </div>

        <div>
          <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tighter flex items-baseline gap-2">
            {rul} <span className="text-lg font-sans font-extrabold text-gray-300">CYCLES</span>
          </div>
          <div className="text-xs mt-2 uppercase font-extrabold font-mono tracking-wider pt-1 border-t-2 border-gray-600 text-gray-300 flex items-center justify-between">
            <span>~{approxFlightHours} FLT HRS (ESTIMATE)</span>
            <span className="text-[10px] text-gray-400 font-normal">FAIL LIMIT: 40%</span>
          </div>
        </div>
      </div>

    </div>
  );
};
