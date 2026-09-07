import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { computeTrendRUL, computeMissionReliability } from '@/lib/prognosticsEngine';
import { GuideLink } from './GuideLink';
import { JargonTooltip } from './JargonTooltip';
import { Compass, Sparkles, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissionReliabilityPanelProps {
  onOpenWhatIf?: () => void;
}

export const MissionReliabilityPanel: React.FC<MissionReliabilityPanelProps> = ({ onOpenWhatIf }) => {
  const {
    engineHealth,
    degradationRate,
    severity,
    missionTimeSeconds,
    missionTotalDuration,
    plainLanguageMode,
  } = useEngineStore();

  const rulResult = React.useMemo(() => {
    return computeTrendRUL(engineHealth, degradationRate, severity);
  }, [engineHealth, degradationRate, severity]);

  const missionReliability = React.useMemo(() => {
    return computeMissionReliability(
      engineHealth,
      rulResult,
      missionTimeSeconds,
      missionTotalDuration,
      severity
    );
  }, [engineHealth, rulResult, missionTimeSeconds, missionTotalDuration, severity]);

  const {
    reliabilityScore,
    status,
    remainingMissionTimeStr,
    predictedSafeOperationStr,
    recommendation,
  } = missionReliability;

  const isCapable = status === 'MISSION_CAPABLE';
  const isWatch = status === 'ENHANCED_MONITORING';
  const isAtRisk = status === 'MISSION_AT_RISK' || status === 'CRITICAL_ABORT';

  return (
    <div className="neo-card bg-white border-4 border-black p-5 flex flex-col justify-between shadow-[4px_4px_0px_0px_#000]">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 border-b-2 border-black pb-3 gap-2">
        <div className="flex items-center gap-2">
          <Compass size={22} className="stroke-[2.5]" />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-lg uppercase tracking-tight leading-none">
                {plainLanguageMode ? 'Can This Engine Finish The Mission? (Mission GO / NO-GO)' : 'Mission Reliability Engine'}
              </h3>
              <JargonTooltip
                term="Mission GO / NO-GO Determination"
                explanation="Compares remaining flight duration against predicted engine safe operation hours before failure. Answers: 'Can we launch this UAV without engine seizure mid-flight?'"
                analogy="Like checking if your car has enough fuel and oil to make a 300 km highway trip without breaking down in the desert."
                technicalDetails="Reliability Score = P(Engine Survival > T_mission). Calculated from Weibull cumulative distribution & RUL safety margins."
              />
            </div>
            <span className="text-[10px] font-mono text-gray-500 uppercase font-bold block mt-0.5">
              {plainLanguageMode ? 'Compares required flight time against safe engine operating margin' : 'SIH26054 Operational Readiness & Decision Support'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenWhatIf && (
            <button
              onClick={onOpenWhatIf}
              className="px-2.5 py-1 text-xs font-mono font-bold bg-black text-white hover:bg-neutral-800 border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000]"
            >
              <Sparkles size={13} className="text-yellow-400" />
              <span>WHAT-IF SIMULATION</span>
            </button>
          )}
          <GuideLink sectionId="10-rul" label="Reliability Model" />
        </div>
      </div>

      {/* Main Grid: Reliability KPI Gauge & Dual Mission Clocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Card 1: Mission Reliability Score Gauge */}
        <div className={cn(
          "p-4 border-2 border-black flex flex-col justify-between shadow-[2px_2px_0px_0px_#000]",
          isCapable && "bg-emerald-50/60",
          isWatch && "bg-amber-50/70",
          isAtRisk && "bg-red-50/80"
        )}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono font-bold uppercase text-gray-700">
              {plainLanguageMode ? 'MISSION READINESS RATING' : 'MISSION RELIABILITY SCORE'}
            </span>
            <span className={cn(
              "text-[10px] font-mono font-extrabold px-2 py-0.5 border border-black uppercase",
              isCapable ? "bg-[var(--color-brand-green)] text-black" :
              isWatch ? "bg-[var(--color-brand-yellow)] text-black" : "bg-[var(--color-brand-red)] text-white"
            )}>
              {plainLanguageMode
                ? (isCapable ? '✓ MISSION GO' : isWatch ? '⚠️ CAUTION / WATCH' : '⛔ NO-GO / ABORT')
                : status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="my-2">
            <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tighter">
              {reliabilityScore.toFixed(1)}<span className="text-2xl font-bold">%</span>
            </div>
            <div className="w-full bg-neutral-200 h-3 border-2 border-black mt-2 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  isCapable ? "bg-emerald-600" : isWatch ? "bg-amber-500" : "bg-red-600"
                )}
                style={{ width: `${reliabilityScore}%` }}
              />
            </div>
          </div>

          <div className="text-[10px] font-mono text-gray-600 leading-tight">
            * Health ({engineHealth.toFixed(1)}%) × RUL Margin ({rulResult.rulNominal}c) × Severity Factor
          </div>
        </div>

        {/* Card 2: Mission Clocks Comparison */}
        <div className="p-4 border-2 border-black bg-white flex flex-col justify-between shadow-[2px_2px_0px_0px_#000]">
          <span className="text-xs font-mono font-bold uppercase text-gray-500 block mb-2">
            Mission Timeline vs Safe Operation Horizon
          </span>

          <div className="grid grid-cols-2 gap-2 font-mono text-center">
            <div className="p-2 border border-black bg-gray-50">
              <span className="text-[10px] text-gray-500 block">REMAINING MISSION</span>
              <span className="text-lg sm:text-xl font-extrabold text-black block">
                {remainingMissionTimeStr}
              </span>
              <span className="text-[9px] text-gray-400">Target Waypoint</span>
            </div>

            <div className={cn(
              "p-2 border border-black",
              isAtRisk ? "bg-red-100 text-red-900 font-bold" : "bg-green-50 text-green-900"
            )}>
              <span className="text-[10px] block opacity-80">PREDICTED SAFE TIME</span>
              <span className="text-lg sm:text-xl font-extrabold block">
                {predictedSafeOperationStr}
              </span>
              <span className="text-[9px] opacity-80">
                {rulResult.rulMin}–{rulResult.rulMax} Cycles RUL
              </span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] font-mono flex justify-between items-center text-gray-600">
            <span>RUL Degradation Rate:</span>
            <strong className="text-black">{rulResult.degradationRatePer10Cycles}% / 10 cycles ({rulResult.trendStatus})</strong>
          </div>
        </div>
      </div>

      {/* Operator Decision Support Card */}
      <div className="p-3.5 border-2 border-black bg-[var(--color-brand-light)] shadow-[2px_2px_0px_0px_#000]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-black" />
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-black">
              OPERATOR ADVISORY & RECOMMENDATION
            </span>
          </div>
          <span className={cn(
            "text-xs font-extrabold font-mono px-3 py-1 border-2 uppercase",
            recommendation.badgeColor
          )}>
            {recommendation.actionText}
          </span>
        </div>

        <p className="text-xs font-mono text-gray-800 mb-2 leading-relaxed">
          <strong>RATIONALE:</strong> {recommendation.primaryReason}
        </p>

        {/* Load Reduction Impact Modeling */}
        <div className="bg-white border border-black p-2.5 font-mono text-xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
            Predicted Effect of Reducing Engine Load by 15%:
          </span>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="p-1 border border-gray-300 bg-emerald-50 text-emerald-900">
              <span className="text-[9px] block text-gray-500">HEALTH STRESS</span>
              <strong>-{recommendation.predictedEffectOfLoadReduction.healthStressReductionPercent}%</strong>
            </div>
            <div className="p-1 border border-gray-300 bg-blue-50 text-blue-900">
              <span className="text-[9px] block text-gray-500">RUL EXPANSION</span>
              <strong>+{recommendation.predictedEffectOfLoadReduction.estimatedRulIncreaseCycles} Cycles</strong>
            </div>
            <div className="p-1 border border-gray-300 bg-amber-50 text-amber-900">
              <span className="text-[9px] block text-gray-500">RELIABILITY BOOST</span>
              <strong>+{recommendation.predictedEffectOfLoadReduction.missionReliabilityIncreasePercent}%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
