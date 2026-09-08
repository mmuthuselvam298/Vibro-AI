import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { AlertOctagon, AlertTriangle, ShieldCheck } from 'lucide-react';

export const AlertBanner: React.FC = () => {
  const { alertStatus, faultType, confidence, rul } = useEngineStore();

  if (alertStatus === 'NOMINAL') {
    return (
      <div className="bg-[var(--color-brand-green)] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-black">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2.5 border-4 border-black shrink-0 shadow-[2px_2px_0px_0px_#000]">
            <ShieldCheck size={28} className="text-emerald-700 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-800">
              DECISION-SUPPORT STATUS: CURRENT ENGINE STATE
            </div>
            <h2 className="font-extrabold text-xl sm:text-2xl uppercase tracking-tight text-black leading-none mt-0.5">
              Nominal • Continue Monitoring
            </h2>
            <p className="font-mono text-xs font-semibold text-neutral-900 mt-1">
              All sensors within nominal bounds of adaptive baseline. Zero candidate defect signatures flagged.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 font-mono text-xs">
          <span className="px-2.5 py-1 border-2 border-black bg-white font-extrabold shadow-[2px_2px_0px_0px_#000]">
            STATUS: NOMINAL
          </span>
        </div>
      </div>
    );
  }

  if (alertStatus === 'WARNING') {
    return (
      <div className="bg-[var(--color-brand-yellow)] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-black">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2.5 border-4 border-black shrink-0 shadow-[2px_2px_0px_0px_#000]">
            <AlertTriangle size={28} className="text-amber-800 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-800">
              DECISION-SUPPORT STATUS: ADVISORY WARNING
            </div>
            <h2 className="font-extrabold text-xl sm:text-2xl uppercase tracking-tight text-black leading-none mt-0.5">
              Warning • Candidate Degradation Detected
            </h2>
            <p className="font-mono text-xs font-semibold text-neutral-900 mt-1">
              {faultType} detected signature ({confidence.toFixed(1)}% agreement). Prototype RUL estimate ~{rul} cycles before maintenance threshold.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 font-mono text-xs">
          <span className="px-2.5 py-1 border-2 border-black bg-black text-white font-extrabold shadow-[2px_2px_0px_0px_#000]">
            ACTION: PRIORITY REVIEW
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-brand-red)] text-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="bg-white p-2.5 border-4 border-black shrink-0 shadow-[2px_2px_0px_0px_#000]">
          <AlertOctagon size={28} className="text-[var(--color-brand-red)] stroke-[2.5]" />
        </div>
        <div>
          <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-white/90">
            DECISION-SUPPORT STATUS: CRITICAL INDICATOR
          </div>
          <h2 className="font-extrabold text-xl sm:text-2xl uppercase tracking-tight text-white leading-none mt-0.5">
            CRITICAL • HIGH DEGRADATION DETECTED
          </h2>
          <p className="font-mono text-xs font-semibold text-white/95 mt-1">
            Elevated candidate signature: {faultType}. Prototype degradation estimate: ~{rul} cycles remaining before threshold.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-center shrink-0 font-mono text-xs">
        <span className="px-2.5 py-1 border-2 border-black bg-white text-black font-extrabold shadow-[2px_2px_0px_0px_#000] animate-bounce">
          ACTION: IMMEDIATE REVIEW
        </span>
      </div>
    </div>
  );
};
