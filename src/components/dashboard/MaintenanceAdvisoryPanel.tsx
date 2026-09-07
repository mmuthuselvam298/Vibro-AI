import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { useBackendEngineState } from '@/hooks/useBackendEngineState';
import { GuideLink } from './GuideLink';
import { JargonTooltip } from './JargonTooltip';
import { Wrench, ShieldAlert, CheckSquare, AlertOctagon, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MaintenanceAdvisoryPanel: React.FC = () => {
  const {
    faultType: simFaultType,
    severity: simSeverity,
    confidence: simConfidence,
    rul: simRul,
    maintenanceAction: simMaintenanceAction,
    maintenanceUrgency: simMaintenanceUrgency,
    evidencePoints: simEvidencePoints,
    plainLanguageMode,
  } = useEngineStore();

  const { maintenance, prognostics, digitalTwin, backendConnected } = useBackendEngineState();

  const activeAdvisory = maintenance && maintenance.length > 0 ? maintenance[0] : null;
  const isBackendActive = Boolean(backendConnected && activeAdvisory);

  const getUrgencyBadge = () => {
    if (isBackendActive && activeAdvisory) {
      const urgency = activeAdvisory.urgency.toUpperCase();
      switch (urgency) {
        case 'IMMEDIATE_REVIEW':
          return {
            label: 'IMMEDIATE REVIEW RECOMMENDED (DECISION-SUPPORT)',
            color: 'bg-[var(--color-brand-red)] text-white border-black animate-pulse',
            icon: <AlertOctagon size={16} />
          };
        case 'PRIORITY_REVIEW':
          return {
            label: 'PRIORITY REVIEW RECOMMENDED (DECISION-SUPPORT)',
            color: 'bg-orange-500 text-white border-black',
            icon: <ShieldAlert size={16} />
          };
        case 'NEXT_SCHEDULED_INSPECTION':
          return {
            label: 'NEXT SCHEDULED INSPECTION',
            color: 'bg-[var(--color-brand-yellow)] text-black border-black',
            icon: <Wrench size={16} />
          };
        case 'INFORMATIONAL':
          return {
            label: 'INFORMATIONAL ADVISORY (MONITORING)',
            color: 'bg-blue-100 text-blue-950 border-blue-500',
            icon: <Info size={16} />
          };
        case 'NONE':
        default:
          return {
            label: 'NO ACTIVE ADVISORY (WITHIN ENVELOPE)',
            color: 'bg-[var(--color-brand-green)] text-black border-black',
            icon: <Info size={16} />
          };
      }
    }

    // Simulation fallback with prototype/decision-support compliant terminology
    switch (simMaintenanceUrgency) {
      case 'IMMEDIATE_GROUND':
        return {
          label: 'IMMEDIATE REVIEW RECOMMENDED (SIMULATED)',
          color: 'bg-[var(--color-brand-red)] text-white border-black animate-pulse',
          icon: <AlertOctagon size={16} />
        };
      case 'WITHIN_20_CYCLES':
        return {
          label: 'PRIORITY REVIEW RECOMMENDED (~20 CYCLES ESTIMATE)',
          color: 'bg-orange-500 text-white border-black',
          icon: <ShieldAlert size={16} />
        };
      case 'NEXT_SCHEDULED':
        return {
          label: 'NEXT SCHEDULED INSPECTION (SIMULATED)',
          color: 'bg-[var(--color-brand-yellow)] text-black border-black',
          icon: <Wrench size={16} />
        };
      default:
        return {
          label: 'NO ACTIVE ADVISORY (NOMINAL ENVELOPE)',
          color: 'bg-[var(--color-brand-green)] text-black border-black',
          icon: <Info size={16} />
        };
    }
  };

  const badge = getUrgencyBadge();

  // Metrics
  const effectiveRul = prognostics?.rul_nominal_cycles ?? digitalTwin?.prognostics?.rul_nominal_cycles ?? simRul;
  const effectiveConfidence = activeAdvisory
    ? (digitalTwin?.overall_health_score ?? simConfidence)
    : simConfidence;
  const effectiveSeverity = isBackendActive
    ? (activeAdvisory?.urgency === 'IMMEDIATE_REVIEW' ? 'HIGH' : activeAdvisory?.urgency === 'PRIORITY_REVIEW' ? 'MEDIUM' : 'LOW')
    : simSeverity;

  const effectiveAction = isBackendActive
    ? activeAdvisory?.prescribed_action
    : simMaintenanceAction;

  const effectiveEvidence = isBackendActive
    ? [
        ...(activeAdvisory?.evidence_summary ? [activeAdvisory.evidence_summary] : []),
        ...(digitalTwin?.evidence ?? [])
      ]
    : simEvidencePoints;

  return (
    <div className="neo-card flex flex-col h-full bg-white">
      <div className="flex flex-wrap justify-between items-center mb-3 border-b-2 border-black pb-2 gap-2">
        <div className="flex items-center gap-2">
          <Wrench size={18} className="stroke-[2.5]" />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-base uppercase tracking-tight">
                {plainLanguageMode ? 'What Should The Operator Do?' : 'Maintenance Advisory'}
              </h3>
              <JargonTooltip
                term="Maintenance Advisory Protocol"
                explanation="Prototype decision-support recommendations generated automatically for ground crews and UAV pilots. Does not constitute airworthiness clearance or regulatory sign-off."
                analogy="Like a check-engine warning that provides actionable troubleshooting suggestions based on sensor symptoms."
                technicalDetails="Mapped to prototype Line Replaceable Unit (LRU) turn-around procedures and condition-based inspection heuristics."
              />
            </div>
            <span className="text-[10px] font-mono text-neutral-500 font-bold block">
              {plainLanguageMode ? 'Decision-support recommendations for maintenance crew' : 'Condition-Based Maintenance (CBM) Advisory Protocol'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isBackendActive ? (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-emerald-600 bg-emerald-100 text-emerald-900">
              BACKEND ADVISORY
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-neutral-400 bg-neutral-100 text-neutral-600">
              SIM FALLBACK
            </span>
          )}
          <GuideLink sectionId="07-ai-fault-diagnosis" label="AI Logic" />
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
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-500">
              Prescribed Advisory Action
            </span>
            {isBackendActive && activeAdvisory && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-black text-white">
                {activeAdvisory.action_type} • {activeAdvisory.target_component}
              </span>
            )}
          </div>
          <p className="font-bold text-sm leading-tight text-black">
            {effectiveAction}
          </p>
        </div>

        {/* Explainable Diagnostic Evidence Chain */}
        <div>
          <span className="text-[11px] font-mono font-bold uppercase text-gray-500 block mb-2">
            Advisory Evidence & Rationale ({isBackendActive ? (activeAdvisory?.target_component || 'Digital Twin') : simFaultType})
          </span>
          <ul className="space-y-1.5 font-mono text-xs">
            {effectiveEvidence.length > 0 ? (
              effectiveEvidence.map((point, index) => (
                <li key={index} className="flex items-start gap-2 bg-gray-50 border border-black p-2">
                  <CheckSquare size={14} className="text-black shrink-0 mt-0.5" />
                  <span className="leading-snug">{point}</span>
                </li>
              ))
            ) : (
              <li className="text-neutral-500 text-[11px] italic p-1">No active maintenance advisory triggers in current envelope.</li>
            )}
          </ul>
        </div>

        {/* Dispatch Metrics Summary */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t-2 border-black text-center font-mono">
          <div className="p-2 border border-black bg-gray-100">
            <span className="text-[10px] text-gray-500 block">SEVERITY</span>
            <span className="font-bold text-xs">{effectiveSeverity}</span>
          </div>
          <div className="p-2 border border-black bg-gray-100">
            <span className="text-[10px] text-gray-500 block">CONFIDENCE</span>
            <span className="font-bold text-xs">{effectiveConfidence.toFixed(1)}%</span>
          </div>
          <div className="p-2 border border-black bg-gray-100">
            <span className="text-[10px] text-gray-500 block">PROTOTYPE RUL</span>
            <span className="font-bold text-xs">{effectiveRul} CYCLES</span>
          </div>
        </div>

        {/* Disclaimer Footer */}
        <div className="text-[10px] font-mono text-neutral-500 border-t border-neutral-300 pt-2 leading-tight">
          * Decision-support heuristic only. Does not constitute flight clearance or certified maintenance sign-off.
        </div>
      </div>
    </div>
  );
};
