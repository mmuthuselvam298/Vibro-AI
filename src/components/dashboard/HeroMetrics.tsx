import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { GuideLink } from './GuideLink';
import { cn } from '@/lib/utils';
import { Activity, AlertTriangle, ShieldAlert, Cpu } from 'lucide-react';

export const HeroMetrics: React.FC = () => {
  const {
    engineHealth,
    faultType,
    severity,
    confidence,
    rul,
    alertStatus
  } = useEngineStore();

  const isHealthy = engineHealth > 85;
  const isWarning = engineHealth <= 85 && engineHealth > 40;
  const isCritical = engineHealth <= 40;

  // Format fault label for clean display
  const displayFault = faultType === 'None (Nominal Operation)' ? 'NONE' : faultType;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

      {/* 1. ENGINE HEALTH */}
      <div className={cn(
        "neo-card flex flex-col justify-between h-44 p-5",
        isHealthy && "bg-[var(--color-brand-green)] text-black",
        isWarning && "bg-[var(--color-brand-yellow)] text-black",
        isCritical && "bg-[var(--color-brand-red)] text-white"
      )}>
        <div className="flex justify-between items-start">
          <span className="font-extrabold uppercase tracking-wider text-xs">Engine Health</span>
          <div className="flex items-center gap-1.5">
            <GuideLink sectionId="09-severity-estimation" label="?" />
            <Activity size={26} className="stroke-[2.5]" />
          </div>
        </div>
        <div>
          <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tighter">
            {engineHealth.toFixed(1)}<span className="text-2xl font-bold">%</span>
          </div>
          <div className="text-xs mt-3 uppercase font-extrabold font-mono tracking-wider pt-1 border-t-2 border-current">
            STATUS: {alertStatus}
          </div>
        </div>
      </div>

      {/* 2. ACTIVE FAULT */}
      <div className="neo-card flex flex-col justify-between h-44 p-5 bg-white">
        <div className="flex justify-between items-start">
          <span className="font-extrabold uppercase tracking-wider text-xs text-gray-600">Active Fault</span>
          <div className="flex items-center gap-1.5">
            <GuideLink sectionId="08-fault-signatures" label="?" />
            <AlertTriangle
              size={26}
              className={cn("stroke-[2.5]", displayFault !== 'NONE' ? 'text-black' : 'text-gray-300')}
            />
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight uppercase line-clamp-1 leading-none mb-1">
            {displayFault}
          </div>
          <div className="flex items-center gap-2 mt-3 pt-1 border-t-2 border-gray-200">
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

      {/* 3. AI CONFIDENCE */}
      <div className="neo-card flex flex-col justify-between h-44 p-5 bg-white">
        <div className="flex justify-between items-start">
          <span className="font-extrabold uppercase tracking-wider text-xs text-gray-600">AI Confidence</span>
          <div className="flex items-center gap-1.5">
            <GuideLink sectionId="07-ai-fault-diagnosis" label="?" />
            <Cpu size={26} className="stroke-[2.5]" />
          </div>
        </div>
        <div>
          <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tighter">
            {confidence.toFixed(1)}<span className="text-2xl font-bold">%</span>
          </div>
          <div className="w-full bg-gray-200 h-3.5 border-2 border-black mt-3 overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-300 ease-out"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. EST. RUL */}
      <div className="neo-card flex flex-col justify-between h-44 p-5 bg-[var(--color-brand-blue)] text-white">
        <div className="flex justify-between items-start">
          <span className="font-extrabold uppercase tracking-wider text-xs text-gray-300">Est. RUL</span>
          <div className="flex items-center gap-1.5">
            <GuideLink sectionId="10-rul" label="?" />
            <ShieldAlert size={26} className="stroke-[2.5]" />
          </div>
        </div>
        <div>
          <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tighter flex items-baseline gap-2">
            {rul} <span className="text-lg font-sans font-extrabold text-gray-300">CYCLES</span>
          </div>
          <div className="text-xs mt-3 uppercase font-extrabold font-mono tracking-wider pt-1 border-t-2 border-gray-600 text-gray-300">
            Remaining Useful Life
          </div>
        </div>
      </div>

    </div>
  );
};
