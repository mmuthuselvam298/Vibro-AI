import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { AlertOctagon, Info, AlertTriangle } from 'lucide-react';

export const AlertBanner: React.FC = () => {
  const { alertStatus, faultType, confidence, rul } = useEngineStore();

  if (alertStatus === 'NOMINAL') {
    return (
      <div className="bg-[var(--color-brand-green)] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex items-center gap-4">
        <div className="bg-white p-3 border-4 border-black shrink-0">
          <Info size={32} className="text-black stroke-[2.5]" />
        </div>
        <div>
          <h3 className="font-extrabold text-xl sm:text-2xl uppercase tracking-tight text-black">System Nominal</h3>
          <p className="font-mono text-sm font-bold text-black mt-0.5">No mechanical faults detected. Operations standard.</p>
        </div>
      </div>
    );
  }

  if (alertStatus === 'WARNING') {
    return (
      <div className="bg-[var(--color-brand-yellow)] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex items-center gap-4">
        <div className="bg-white p-3 border-4 border-black shrink-0">
          <AlertTriangle size={32} className="text-black stroke-[2.5]" />
        </div>
        <div>
          <h3 className="font-extrabold text-xl sm:text-2xl uppercase tracking-tight text-black">Early Degradation Detected</h3>
          <p className="font-mono text-sm font-bold text-black mt-0.5">
            {faultType} detected ({confidence.toFixed(1)}% conf). RUL: {rul} cycles. Recommended: Inspect during turnaround.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-brand-red)] text-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex items-center gap-4">
      <div className="bg-white p-3 border-4 border-black shrink-0">
        <AlertOctagon size={32} className="text-[var(--color-brand-red)] stroke-[2.5]" />
      </div>
      <div>
        <h3 className="font-extrabold text-xl sm:text-2xl uppercase tracking-tight text-white">Critical Mechanical Degradation</h3>
        <p className="font-mono text-sm font-bold text-white mt-0.5">
          High-confidence {faultType}. RUL critical ({rul} cycles). Action: Terminate mission if operational constraints permit.
        </p>
      </div>
    </div>
  );
};
