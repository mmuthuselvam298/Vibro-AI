import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { GuideLink } from './GuideLink';
import { Wrench, ShieldAlert, CheckSquare, AlertOctagon, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MaintenanceAdvisoryPanel: React.FC = () => {
  const {
    faultType,
    severity,
    confidence,
    rul,
    maintenanceAction,
    maintenanceUrgency,
    evidencePoints
  } = useEngineStore();

  const getUrgencyBadge = () => {
    switch (maintenanceUrgency) {
      case 'IMMEDIATE_GROUND':
        return {
          label: 'IMMEDIATE GROUNDING (NO-GO)',
          color: 'bg-[var(--color-brand-red)] text-white border-black animate-pulse',
          icon: <AlertOctagon size={16} />
        };
      case 'WITHIN_20_CYCLES':
        return {
          label: 'ACTION REQUIRED < 20 CYCLES',
          color: 'bg-orange-500 text-white border-black',
          icon: <ShieldAlert size={16} />
        };
      case 'NEXT_SCHEDULED':
        return {
          label: 'SCHEDULED TURNAROUND CHECK',
          color: 'bg-[var(--color-brand-yellow)] text-black border-black',
          icon: <Wrench size={16} />
        };
      default:
        return {
          label: 'CLEARED FOR MISSION DISPATCH',
          color: 'bg-[var(--color-brand-green)] text-black border-black',
          icon: <Info size={16} />
        };
    }
  };

  const badge = getUrgencyBadge();

  return (
    <div className="neo-card flex flex-col h-full bg-white">
      <div className="flex flex-wrap justify-between items-center mb-3 border-b-2 border-black pb-2 gap-2">
        <div className="flex items-center gap-2">
          <Wrench size={18} className="stroke-[2.5]" />
          <h3 className="font-extrabold text-base uppercase tracking-tight">Maintenance Advisory</h3>
        </div>
        <div className="flex items-center gap-2">
          <GuideLink sectionId="07-ai-fault-diagnosis" label="AI Decision Logic" />
        </div>
      </div>

      {/* Urgency Status Banner */}
      <div className={cn("p-3 border-2 mb-4 flex items-center gap-2 font-mono font-bold text-xs uppercase shadow-[var(--shadow-neobrutalism-sm)]", badge.color)}>
        {badge.icon}
        <span>{badge.label}</span>
      </div>

      <div className="flex-1 space-y-4">
        {/* Recommended Action */}
        <div className="bg-[var(--color-brand-light)] border-2 border-black p-3">
          <span className="text-[10px] font-mono font-bold uppercase text-gray-500 block mb-1">
            Prescribed Engineering Action
          </span>
          <p className="font-bold text-sm leading-tight text-black">
            {maintenanceAction}
          </p>
        </div>

        {/* Explainable Diagnostic Evidence Chain */}
        <div>
          <span className="text-[11px] font-mono font-bold uppercase text-gray-500 block mb-2">
            Explainable AI Evidence Chain ({faultType})
          </span>
          <ul className="space-y-1.5 font-mono text-xs">
            {evidencePoints.map((point, index) => (
              <li key={index} className="flex items-start gap-2 bg-gray-50 border border-black p-2">
                <CheckSquare size={14} className="text-black shrink-0 mt-0.5" />
                <span className="leading-snug">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Dispatch Metrics Summary */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t-2 border-black text-center font-mono">
          <div className="p-2 border border-black bg-gray-100">
            <span className="text-[10px] text-gray-500 block">SEVERITY</span>
            <span className="font-bold text-xs">{severity}</span>
          </div>
          <div className="p-2 border border-black bg-gray-100">
            <span className="text-[10px] text-gray-500 block">CONFIDENCE</span>
            <span className="font-bold text-xs">{confidence.toFixed(1)}%</span>
          </div>
          <div className="p-2 border border-black bg-gray-100">
            <span className="text-[10px] text-gray-500 block">REMAINING RUL</span>
            <span className="font-bold text-xs">{rul} CYCLES</span>
          </div>
        </div>
      </div>
    </div>
  );
};
