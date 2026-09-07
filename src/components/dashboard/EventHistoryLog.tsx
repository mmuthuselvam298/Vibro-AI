import React from 'react';
import { useEngineStore, type SeverityType } from '@/store/engineStore';
import { History } from 'lucide-react';
import { cn } from '@/lib/utils';

export const EventHistoryLog: React.FC = () => {
  const { eventLog, resetToHealthy } = useEngineStore();

  const getSeverityBadge = (severity: SeverityType) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-[var(--color-brand-red)] text-white border-black';
      case 'HIGH':
        return 'bg-orange-500 text-white border-black';
      case 'MEDIUM':
        return 'bg-[var(--color-brand-yellow)] text-black border-black';
      case 'LOW':
        return 'bg-blue-100 text-blue-900 border-black';
      case 'NOMINAL':
      default:
        return 'bg-green-100 text-green-900 border-black';
    }
  };

  return (
    <div className="neo-card bg-white border-4 border-black p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_#000] h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2 mb-3">
        <div className="flex items-center gap-2">
          <History size={18} className="stroke-[2.5]" />
          <h4 className="font-extrabold text-sm uppercase tracking-tight font-mono text-black">
            Session Event & Alert History Log
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black bg-neutral-100">
            {eventLog.length} EVENTS RECORDED
          </span>
          <button
            onClick={resetToHealthy}
            className="text-[10px] font-mono font-bold px-2 py-0.5 border border-black bg-neutral-200 hover:bg-black hover:text-white transition-colors"
            title="Reset engine to nominal healthy baseline"
          >
            Reset Engine
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2 pr-1 font-mono text-xs">
        {eventLog.map((evt) => (
          <div
            key={evt.id}
            className="p-2 border border-black bg-neutral-50 flex items-start justify-between gap-2 shadow-[1px_1px_0px_0px_#000]"
          >
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 font-bold">{evt.time}</span>
                <span className="font-extrabold text-xs text-black truncate">{evt.title}</span>
              </div>
              <p className="text-[11px] text-neutral-700 leading-tight">
                {evt.detail}
              </p>
            </div>

            <span className={cn(
              "text-[9px] font-extrabold px-1.5 py-0.2 border shrink-0",
              getSeverityBadge(evt.severity)
            )}>
              {evt.severity}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-neutral-200 text-[10px] font-mono text-neutral-500">
        * Chronological session ledger records all injected faults, pilot actions, and envelope threshold shifts.
      </div>
    </div>
  );
};
