import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { useSignalStore } from '@/store/signalStore';
import { useBackendEngineState } from '@/hooks/useBackendEngineState';
import { computeAdaptiveBaseline } from '@/lib/physicsBaseline';
import { evaluateAnomalyAndEvidence } from '@/lib/anomalyEngine';
import { GuideLink } from './GuideLink';
import { Target, CheckCircle2, AlertTriangle, HelpCircle, ShieldCheck, ShieldAlert, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DiagnosisPanel: React.FC = () => {
  const { faultType: simFaultType, confidence: simConfidence, evidencePoints: simEvidencePoints, telemetry, missionProfile, plainLanguageMode } = useEngineStore();
  const { timeFeatures, spectralFeatures } = useSignalStore();
  const { digitalTwin, faults, backendConnected } = useBackendEngineState();

  // Compute adaptive baseline and evaluate genuine anomaly & evidence fusion for fallback
  const baseline = React.useMemo(() => {
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

  const anomalyResult = React.useMemo(() => {
    return evaluateAnomalyAndEvidence(timeFeatures, spectralFeatures, baseline);
  }, [timeFeatures, spectralFeatures, baseline]);

  const {
    anomalyScore: simAnomalyScore,
    evidenceConsistency: simEvidenceConsistency,
    topContributors: simTopContributors,
    whyFlagged: simWhyFlagged,
    sensorIntegrityWarning,
  } = anomalyResult;

  // Check if backend state is actively available
  const latestBackendFault = faults && faults.length > 0 ? faults[0] : null;
  const isBackendActive = Boolean(backendConnected && (digitalTwin || latestBackendFault));

  // Determine effective values
  const effectiveFaultName = isBackendActive
    ? latestBackendFault
      ? latestBackendFault.fault_title || latestBackendFault.fault_code.replace(/_/g, ' ')
      : digitalTwin?.operational_status === 'HEALTHY'
        ? 'NOMINAL / NO CANDIDATE FAULT'
        : (digitalTwin?.operational_status ? `${digitalTwin.operational_status} STATE` : simFaultType)
    : simFaultType;

  const effectiveConfidence = isBackendActive
    ? latestBackendFault
      ? latestBackendFault.confidence
      : (digitalTwin?.overall_health_score ?? simConfidence)
    : simConfidence;

  const effectiveAnomalyScore = isBackendActive
    ? latestBackendFault
      ? Math.round(latestBackendFault.confidence)
      : Math.round(100 - (digitalTwin?.overall_health_score ?? 100))
    : simAnomalyScore;

  const effectiveEvidencePoints: string[] = isBackendActive
    ? (digitalTwin?.evidence && digitalTwin.evidence.length > 0)
      ? digitalTwin.evidence
      : (latestBackendFault?.evidence && latestBackendFault.evidence.length > 0)
        ? latestBackendFault.evidence
        : simEvidencePoints
    : simEvidencePoints;

  const effectiveWhyFlagged: string[] = isBackendActive
    ? latestBackendFault?.fusion_summary
      ? [latestBackendFault.fusion_summary, ...(digitalTwin?.evidence ?? []).filter(e => e !== latestBackendFault.fusion_summary)]
      : (digitalTwin?.evidence && digitalTwin.evidence.length > 0)
        ? digitalTwin.evidence
        : simWhyFlagged
    : simWhyFlagged;

  const getConsistencyBadge = () => {
    if (isBackendActive && latestBackendFault) {
      const consistency = latestBackendFault.evidence_consistency?.toUpperCase() || '';
      if (consistency.includes('CORROBORATED') || consistency.includes('MECHANICAL')) {
        return {
          label: 'CANDIDATE INDICATOR (PHYSICALLY CORROBORATED)',
          className: 'bg-[var(--color-brand-red)] text-white border-black',
          icon: <ShieldAlert size={14} />,
        };
      }
      if (consistency.includes('SENSOR')) {
        return {
          label: 'POSSIBLE SENSOR DISCREPANCY / CANDIDATE DRIFT',
          className: 'bg-[var(--color-brand-yellow)] text-black border-black',
          icon: <AlertTriangle size={14} />,
        };
      }
      return {
        label: 'OPERATIONAL VARIATION (PROTOTYPE HEURISTIC)',
        className: 'bg-[var(--color-brand-green)] text-black border-black',
        icon: <ShieldCheck size={14} />,
      };
    }

    if (isBackendActive && digitalTwin?.operational_status === 'HEALTHY') {
      return {
        label: 'NOMINAL OPERATIONAL PROFILE (IN ENVELOPE)',
        className: 'bg-[var(--color-brand-green)] text-black border-black',
        icon: <ShieldCheck size={14} />,
      };
    }

    // Simulation fallback badge
    switch (simEvidenceConsistency) {
      case 'MECHANICAL_FAULT_LIKELY':
        return {
          label: 'MECHANICAL FAULT LIKELY (PHYSICALLY CORROBORATED)',
          className: 'bg-[var(--color-brand-red)] text-white border-black',
          icon: <ShieldAlert size={14} />,
        };
      case 'POSSIBLE_SENSOR_FAULT':
        return {
          label: 'POSSIBLE SENSOR FAULT / SENSOR DRIFT DETECTED',
          className: 'bg-[var(--color-brand-yellow)] text-black border-black',
          icon: <AlertTriangle size={14} />,
        };
      case 'NORMAL_OPERATIONAL_VARIATION':
      default:
        return {
          label: 'NORMAL OPERATIONAL VARIATION (IN ENVELOPE)',
          className: 'bg-[var(--color-brand-green)] text-black border-black',
          icon: <ShieldCheck size={14} />,
        };
    }
  };

  const consistencyInfo = getConsistencyBadge();

  return (
    <div className="neo-card h-full flex flex-col bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-3 border-b-2 border-black pb-2 gap-2">
        <div className="flex items-center gap-2">
          <Target size={18} className="stroke-[2.5]" />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-base uppercase tracking-tight">
                {plainLanguageMode ? "What's Wrong & Why" : "Multi-Parameter Anomaly Engine"}
              </h3>
              <GuideLink sectionId="07-ai-fault-diagnosis" label="AI" />
            </div>
            <span className="text-[10px] font-mono text-neutral-500 font-bold block">
              {plainLanguageMode ? 'Heuristic Pattern Recognition & Sensor Evidence Fusion' : 'Bayesian Evidence Fusion & Spectral Classifier'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isBackendActive ? (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-emerald-600 bg-emerald-100 text-emerald-900">
              BACKEND SOURCE
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-neutral-400 bg-neutral-100 text-neutral-600">
              SIM FALLBACK
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* Evidence Consistency Banner */}
        <div className={cn(
          "p-2.5 border-2 font-mono font-bold text-xs flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000]",
          consistencyInfo.className
        )}>
          <div className="flex items-center gap-2">
            {consistencyInfo.icon}
            <span>{consistencyInfo.label}</span>
          </div>
          <span className="text-[10px] uppercase underline hidden sm:inline">DECISION-SUPPORT</span>
        </div>

        {/* Primary Classification / Inferred Fault */}
        <div>
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase mb-1">
            <span>Candidate Indicator / Estimated Anomaly</span>
            <span className="font-mono text-[10px]">Anomaly Score: {effectiveAnomalyScore}/100</span>
          </div>
          <div className="bg-[var(--color-brand-light)] border-4 border-black p-3">
            <div className="flex justify-between items-end mb-1">
              <span className="font-bold text-base sm:text-lg leading-tight">
                {sensorIntegrityWarning && !isBackendActive ? 'Sensor Drift / Accelerometer Bias' : effectiveFaultName}
              </span>
              <span className="font-mono font-bold text-xl">{effectiveConfidence.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-300 h-2.5 border-2 border-black">
              <div
                className={cn(
                  "h-full transition-all",
                  effectiveAnomalyScore > 70 ? "bg-[var(--color-brand-red)]" :
                  effectiveAnomalyScore > 40 ? "bg-orange-500" :
                  effectiveAnomalyScore > 20 ? "bg-[var(--color-brand-yellow)]" : "bg-black"
                )}
                style={{ width: `${Math.min(100, Math.max(5, effectiveConfidence))}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-neutral-500 mt-1">
              * Prototype estimate for engineering decision support; not a certified failure confirmation.
            </div>
          </div>
        </div>

        {/* SENSOR INTEGRITY WARNING BOX (If Drift Isolated in simulation fallback) */}
        {!isBackendActive && sensorIntegrityWarning && (
          <div className="p-3 border-2 border-black bg-amber-50 shadow-[var(--shadow-neobrutalism-sm)] space-y-1.5 font-mono">
            <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 uppercase">
              <AlertTriangle size={16} />
              <span>SENSOR INTEGRITY WARNING ({sensorIntegrityWarning.affectedSensor})</span>
            </div>
            <p className="text-[11px] text-gray-800 leading-tight">
              {sensorIntegrityWarning.details}
            </p>
            <div className="text-[10px] font-bold text-blue-900 pt-1 border-t border-amber-300">
              RECOMMENDATION: {sensorIntegrityWarning.recommendation}
            </div>
          </div>
        )}

        {/* PROMINENT "WHY DID THE SYSTEM FLAG THIS?" PANEL */}
        <div className="border-2 border-black p-3 bg-neutral-50 shadow-[var(--shadow-neobrutalism-sm)]">
          <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-gray-300">
            <HelpCircle size={15} className="text-black" />
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-black">
              WHY DID THE SYSTEM FLAG THIS?
            </span>
          </div>
          <ul className="space-y-1.5 font-mono text-xs">
            {effectiveWhyFlagged.length > 0 ? (
              effectiveWhyFlagged.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-white border border-black p-1.5">
                  <span className="font-bold text-[var(--color-brand-blue)] shrink-0">{idx + 1}.</span>
                  <span className="leading-tight text-gray-800 font-medium">{reason}</span>
                </li>
              ))
            ) : (
              <li className="text-neutral-500 text-[11px] italic p-1">No anomalous triggers recorded in active envelope.</li>
            )}
          </ul>
        </div>

        {/* TOP CONTRIBUTING PARAMETERS (Simulation Fallback / Auxiliary Context) */}
        <div>
          <div className="text-xs font-mono font-bold text-gray-500 uppercase mb-1.5">
            Top Contributing Parameter Deviations
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            {simTopContributors.map((c, i) => (
              <div key={i} className="p-2 border border-black bg-white flex flex-col justify-between shadow-[1px_1px_0px_0px_#000]">
                <span className="text-[10px] text-gray-600 font-bold truncate" title={c.name}>
                  {i + 1}. {c.name}
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className={cn(
                    "font-extrabold text-xs flex items-center",
                    c.direction === 'UP' ? "text-red-700" : c.direction === 'DOWN' ? "text-blue-700" : "text-black"
                  )}>
                    {c.direction === 'UP' ? <ArrowUpRight size={13} /> : c.direction === 'DOWN' ? <ArrowDownRight size={13} /> : null}
                    {c.deviationPercent > 0 ? `+${c.deviationPercent}%` : `${c.deviationPercent}%`}
                  </span>
                  <span className="text-[9px] px-1 py-0.5 border border-black bg-gray-100 text-gray-700">
                    W: {(c.weight * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diagnostic Evidence Chain */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <div className="text-xs font-mono font-bold text-gray-500 uppercase">
              Supporting Physics & DSP Evidence
            </div>
            <GuideLink sectionId="08-fault-signatures" label="Signatures" />
          </div>
          <ul className="space-y-1 font-mono text-xs">
            {effectiveEvidencePoints.map((ev, i) => (
              <li key={i} className="flex items-start gap-2 bg-gray-50 border border-black p-1.5">
                <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-emerald-700" />
                <span className="leading-tight text-[11px]">{ev}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
