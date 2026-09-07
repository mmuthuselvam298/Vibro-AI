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
              QUESTION: IS THE ENGINE OKAY RIGHT NOW?
            </div>
            <h3 className="font-extrabold text-xl sm:text-2xl uppercase tracking-tight text-black leading-none mt-0.5">
              Yes • Engine Is Healthy & Cleared To Fly
            </h3>
            <p className="font-mono text-xs font-semibold text-neutral-900 mt-1">
              All 9 sensors match the healthy physics baseline. Zero mechanical defects or vibration spikes detected.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 font-mono text-xs">
          <span className="px-2.5 py-1 border-2 border-black bg-white font-extrabold shadow-[2px_2px_0px_0px_#000]">
            ACTION: CONTINUE FLIGHT
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
              QUESTION: IS THE ENGINE OKAY RIGHT NOW?
            </div>
            <h3 className="font-extrabold text-xl sm:text-2xl uppercase tracking-tight text-black leading-none mt-0.5">
              Warning • Early Component Degradation Detected
            </h3>
            <p className="font-mono text-xs font-semibold text-neutral-900 mt-1">
              {faultType} confirmed ({confidence.toFixed(1)}% match). Engine has ~{rul} cycles remaining before critical boundary.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 font-mono text-xs">
          <span className="px-2.5 py-1 border-2 border-black bg-black text-white font-extrabold shadow-[2px_2px_0px_0px_#000]">
            ACTION: TURNAROUND SERVICE
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
            QUESTION: IS THE ENGINE OKAY RIGHT NOW?
          </div>
          <h3 className="font-extrabold text-xl sm:text-2xl uppercase tracking-tight text-white leading-none mt-0.5">
            DANGER • CRITICAL MECHANICAL FAILURE IMMINENT
          </h3>
          <p className="font-mono text-xs font-semibold text-white/95 mt-1">
            Severe {faultType}. Time-to-failure critical ({rul} cycles left). Component at risk of seizure.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-center shrink-0 font-mono text-xs">
        <span className="px-2.5 py-1 border-2 border-black bg-white text-black font-extrabold shadow-[2px_2px_0px_0px_#000] animate-bounce">
          ACTION: RETURN TO BASE NOW
        </span>
      </div>
    </div>
  );
};
