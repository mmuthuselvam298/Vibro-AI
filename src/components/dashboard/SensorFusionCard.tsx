import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { GuideLink } from './GuideLink';
import { JargonTooltip } from './JargonTooltip';
import { GitMerge, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SensorFusionCard: React.FC = () => {
  const { fusionSummary, scenario, alertStatus, telemetry, plainLanguageMode } = useEngineStore();

  const isWarning = alertStatus === 'WARNING';
  const isCritical = alertStatus === 'CRITICAL';

  // Compute active fusion contributors based on residuals
  const chtResidual = Math.abs(telemetry.cht.current - telemetry.cht.expected);
  const oilResidual = Math.abs(telemetry.oilPressure.current - telemetry.oilPressure.expected);
  const vibResidual = Math.abs(telemetry.vibrationRms.current - telemetry.vibrationRms.expected);
  const egtResidual = Math.abs(telemetry.egt.current - telemetry.egt.expected);

  return (
    <div className={cn(
      "neo-card border-2 border-black p-4 flex flex-col justify-between transition-all bg-white relative overflow-hidden",
      isCritical && "border-l-8 border-l-[var(--color-brand-red)]",
      isWarning && "border-l-8 border-l-[var(--color-brand-yellow)]",
      !isCritical && !isWarning && "border-l-8 border-l-[var(--color-brand-green)]"
    )}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <GitMerge size={18} className="stroke-[2.5]" />
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-extrabold text-sm uppercase tracking-tight text-neutral-900">
                {plainLanguageMode ? 'Cross-Sensor Correlation' : 'Multi-Parameter Sensor Fusion'}
              </h4>
              <JargonTooltip
                term="Sensor Fusion"
                explanation="Combining data from multiple different types of sensors (vibration + temperature + pressure) so one isolated sensor glitch cannot trigger a false alarm."
                analogy="Like hearing a thunderclap AND seeing lightning flash AND smelling ozone — all 3 confirm a storm is real, not just a car door slamming."
                technicalDetails="Cross-correlates high-rate vibration RMS (1000 Hz) with slower thermal and hydraulic channels (100 Hz) using Bayesian joint likelihood."
              />
            </div>
            <span className="text-[10px] font-mono text-gray-500 font-bold block">
              {plainLanguageMode ? 'Cross-references vibration, heat, and pressure together' : 'Bayesian Cross-Domain Evidence Aggregation'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-black bg-neutral-100 text-black">
            STATE: {scenario.replace(/_/g, ' ')}
          </span>
          <GuideLink sectionId="05-sensor-fusion" label="Fusion Model" />
        </div>
      </div>

      {/* Synthesis Message */}
      <div className="my-1">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-0.5">
          Sensor Cross-Correlation & Evidence Synthesis:
        </div>
        <p className="font-mono text-sm font-bold leading-relaxed text-neutral-900">
          {fusionSummary}
        </p>
      </div>

      {/* Sensor correlation pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-gray-200 font-mono text-[11px] font-bold">
        <div className="p-2 border border-black bg-gray-50 flex items-center justify-between">
          <div>
            <span className="text-gray-600 block text-[10px]">Vibration Wave</span>
            <span className="text-[9px] text-gray-400 font-mono">RMS Shocks</span>
          </div>
          <span className="flex items-center gap-1">
            {vibResidual > 0.3 ? <AlertTriangle size={13} className="text-red-600 shrink-0" /> : <CheckCircle size={13} className="text-green-600 shrink-0" />}
            <span className={vibResidual > 0.3 ? "text-red-700 font-bold" : "text-neutral-800"}>
              {vibResidual > 0.3 ? 'ANOMALOUS' : 'MATCH'}
            </span>
          </span>
        </div>

        <div className="p-2 border border-black bg-gray-50 flex items-center justify-between">
          <div>
            <span className="text-gray-600 block text-[10px]">Cylinder Heat</span>
            <span className="text-[9px] text-gray-400 font-mono">CHT Thermal</span>
          </div>
          <span className="flex items-center gap-1">
            {chtResidual > 5 ? <AlertTriangle size={13} className="text-orange-600 shrink-0" /> : <CheckCircle size={13} className="text-green-600 shrink-0" />}
            <span className={chtResidual > 5 ? "text-orange-700 font-bold" : "text-neutral-800"}>
              {chtResidual > 5 ? 'ELEVATED' : 'MATCH'}
            </span>
          </span>
        </div>

        <div className="p-2 border border-black bg-gray-50 flex items-center justify-between">
          <div>
            <span className="text-gray-600 block text-[10px]">Oil Line Pressure</span>
            <span className="text-[9px] text-gray-400 font-mono">Hydraulic Flow</span>
          </div>
          <span className="flex items-center gap-1">
            {oilResidual > 0.2 ? <AlertTriangle size={13} className="text-red-600 shrink-0" /> : <CheckCircle size={13} className="text-green-600 shrink-0" />}
            <span className={oilResidual > 0.2 ? "text-red-700 font-bold" : "text-neutral-800"}>
              {oilResidual > 0.2 ? 'PRESSURE DROP' : 'MATCH'}
            </span>
          </span>
        </div>

        <div className="p-2 border border-black bg-gray-50 flex items-center justify-between">
          <div>
            <span className="text-gray-600 block text-[10px]">Exhaust Heat</span>
            <span className="text-[9px] text-gray-400 font-mono">EGT Burn</span>
          </div>
          <span className="flex items-center gap-1">
            {egtResidual > 15 ? <AlertTriangle size={13} className="text-orange-600 shrink-0" /> : <CheckCircle size={13} className="text-green-600 shrink-0" />}
            <span className={egtResidual > 15 ? "text-orange-700 font-bold" : "text-neutral-800"}>
              {egtResidual > 15 ? 'DEVIATION' : 'MATCH'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
