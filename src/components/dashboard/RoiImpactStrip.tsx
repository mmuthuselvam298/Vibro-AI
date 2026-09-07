import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { TrendingUp, Clock, AlertOctagon, DollarSign, ShieldCheck } from 'lucide-react';

export const RoiImpactStrip: React.FC = () => {
  const { engineHealth, rul, scenario } = useEngineStore();

  // Conservative illustrative estimations based on health & RUL
  const isHealthy = scenario === 'HEALTHY';
  const flightHoursAhead = isHealthy ? 85 : Math.max(12, Math.round(rul * 0.45));
  const costSavingsPercent = isHealthy ? 72 : Math.min(85, Math.max(45, Math.round(100 - engineHealth * 0.4)));

  return (
    <div className="neo-card bg-neutral-900 text-white border-4 border-black p-4 flex flex-col gap-3 shadow-[4px_4px_0px_0px_#000]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-700 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-[var(--color-brand-yellow)]" />
          <span className="font-mono font-extrabold text-xs uppercase tracking-wider text-white">
            Operational Value & Safety ROI (Estimated Fleet Impact)
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-neutral-700 bg-neutral-800 text-neutral-300">
          ILLUSTRATIVE ESTIMATE
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-2.5 border border-neutral-700 bg-neutral-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-neutral-400 font-bold uppercase block flex items-center gap-1">
            <Clock size={12} className="text-yellow-400" /> Early Warning Lead Time
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-white my-1">
            ~{flightHoursAhead} Hours
          </div>
          <span className="text-[9px] text-neutral-400 leading-tight">
            Catches sub-surface defects before in-flight catastrophic seizure
          </span>
        </div>

        <div className="p-2.5 border border-neutral-700 bg-neutral-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-neutral-400 font-bold uppercase block flex items-center gap-1">
            <AlertOctagon size={12} className="text-red-400" /> In-Flight Aborts Avoided
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--color-brand-green)] my-1">
            Zero Unplanned Loss
          </div>
          <span className="text-[9px] text-neutral-400 leading-tight">
            Turnaround maintenance scheduled before mission dispatch
          </span>
        </div>

        <div className="p-2.5 border border-neutral-700 bg-neutral-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-neutral-400 font-bold uppercase block flex items-center gap-1">
            <DollarSign size={12} className="text-emerald-400" /> Overhaul Cost Avoidance
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--color-brand-yellow)] my-1">
            ~{costSavingsPercent}% Saved
          </div>
          <span className="text-[9px] text-neutral-400 leading-tight">
            Component replacement vs whole engine block & airframe destruction
          </span>
        </div>

        <div className="p-2.5 border border-neutral-700 bg-neutral-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-neutral-400 font-bold uppercase block flex items-center gap-1">
            <ShieldCheck size={12} className="text-blue-400" /> Fleet Dispatch Availability
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-white my-1">
            +38% Sortie Ready
          </div>
          <span className="text-[9px] text-neutral-400 leading-tight">
            Condition-based maintenance replaces rigid calendar-day groundings
          </span>
        </div>
      </div>

      <div className="text-[9px] font-mono text-neutral-400 text-center sm:text-left">
        * Conservative illustrative model comparing condition-based vibration prognostics against traditional calendar overhaul schedules.
      </div>
    </div>
  );
};
