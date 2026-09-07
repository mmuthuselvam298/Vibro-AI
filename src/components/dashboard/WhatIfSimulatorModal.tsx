import React, { useState } from 'react';
import { useEngineStore } from '@/store/engineStore';
import { computeTrendRUL, computeMissionReliability, simulateWhatIfAction, type WhatIfScenarioResult } from '@/lib/prognosticsEngine';
import { Sparkles, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatIfSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WhatIfOption = 'BASELINE' | 'REDUCE_LOAD_15' | 'REDUCE_RPM_10' | 'RETURN_TO_BASE';

export const WhatIfSimulatorModal: React.FC<WhatIfSimulatorModalProps> = ({ isOpen, onClose }) => {
  const {
    engineHealth,
    degradationRate,
    severity,
    missionTimeSeconds,
    missionTotalDuration,
  } = useEngineStore();

  const [selectedAction, setSelectedAction] = useState<WhatIfOption>('REDUCE_LOAD_15');

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

  const whatIfResult: WhatIfScenarioResult = React.useMemo(() => {
    return simulateWhatIfAction(
      selectedAction,
      engineHealth,
      rulResult.rulNominal,
      missionReliability.reliabilityScore
    );
  }, [selectedAction, engineHealth, rulResult.rulNominal, missionReliability.reliabilityScore]);

  if (!isOpen) return null;

  const options: { id: WhatIfOption; title: string; subtitle: string }[] = [
    { id: 'BASELINE', title: 'Continue Current Flight Profile', subtitle: 'No intervention, maintain current throttle & RPM' },
    { id: 'REDUCE_LOAD_15', title: 'Throttle Back -15% Manifold Load', subtitle: 'Reduces journal bearing contact stress & heat rejection demand' },
    { id: 'REDUCE_RPM_10', title: 'Reduce Governor RPM by 10% (3,240 RPM)', subtitle: 'Lowers dynamic cyclic impact velocity at bearing raceway' },
    { id: 'RETURN_TO_BASE', title: 'Immediate Return-to-Base (RTB)', subtitle: 'Abbreviates mission horizon to safe 20m landing corridor' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="neo-card bg-white border-4 border-black w-full max-w-3xl flex flex-col gap-4 p-5 shadow-[8px_8px_0px_0px_#000] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b-4 border-black pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={24} className="text-black" />
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight">
                Digital Twin &quot;What-If&quot; Physics Simulation
              </h2>
              <p className="text-xs font-mono text-gray-500">
                PROJECTION ENGINE: First-principles simulation of operator intervention on RUL & mission reliability.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-black bg-gray-100 hover:bg-black hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Candidate Selection */}
        <div>
          <span className="text-xs font-mono font-bold uppercase text-gray-500 block mb-2">
            Select Operational Candidate Action:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {options.map((opt) => {
              const isSelected = selectedAction === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedAction(opt.id)}
                  className={cn(
                    "p-3 border-2 text-left transition-all flex flex-col justify-between font-mono",
                    isSelected
                      ? "border-black bg-black text-white shadow-[2px_2px_0px_0px_#000]"
                      : "border-black bg-gray-50 hover:bg-white text-black"
                  )}
                >
                  <div className="font-extrabold text-xs uppercase flex justify-between items-center">
                    <span>{opt.title}</span>
                    {isSelected && <Check size={14} className="text-emerald-400 shrink-0" />}
                  </div>
                  <span className={cn("text-[10px] mt-1 leading-snug", isSelected ? "text-gray-300" : "text-gray-600")}>
                    {opt.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side-by-Side Comparison: Current vs Projected What-If */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-2 border-black p-4 bg-neutral-50 font-mono">
          {/* Current State */}
          <div className="p-3 border-2 border-black bg-white">
            <span className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
              CURRENT LIVE OPERATION
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-600">Engine Health:</span>
                <strong>{engineHealth.toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-600">Estimated RUL:</span>
                <strong>{rulResult.rulNominal} Cycles</strong>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-600">Mission Reliability:</span>
                <strong className={cn(
                  missionReliability.reliabilityScore > 75 ? "text-emerald-700" :
                  missionReliability.reliabilityScore > 45 ? "text-amber-700" : "text-red-700"
                )}>
                  {missionReliability.reliabilityScore}%
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Stress:</span>
                <span className="text-gray-800">100% (Nominal)</span>
              </div>
            </div>
          </div>

          {/* Projected What-If State */}
          <div className="p-3 border-2 border-black bg-emerald-50/70">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold uppercase text-emerald-900 block">
                PROJECTED WHAT-IF STATE
              </span>
              <span className="text-[9px] px-1.5 py-0.2 border border-black bg-white font-bold">
                {whatIfResult.projectedStatus}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-emerald-300 pb-1">
                <span className="text-gray-600">Projected Health:</span>
                <strong className="text-emerald-900">{whatIfResult.projectedHealth.toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between border-b border-emerald-300 pb-1">
                <span className="text-gray-600">Projected RUL:</span>
                <strong className="text-blue-900 flex items-center gap-1">
                  {whatIfResult.projectedRulCycles} Cycles
                  {whatIfResult.projectedRulCycles > rulResult.rulNominal && (
                    <span className="text-[10px] text-emerald-700 font-bold">
                      (+{whatIfResult.projectedRulCycles - rulResult.rulNominal}c)
                    </span>
                  )}
                </strong>
              </div>
              <div className="flex justify-between border-b border-emerald-300 pb-1">
                <span className="text-gray-600">Mission Reliability:</span>
                <strong className="text-emerald-900 flex items-center gap-1">
                  {whatIfResult.projectedReliability}%
                  {whatIfResult.projectedReliability > missionReliability.reliabilityScore && (
                    <span className="text-[10px] text-emerald-700 font-bold">
                      (+{(whatIfResult.projectedReliability - missionReliability.reliabilityScore).toFixed(0)}%)
                    </span>
                  )}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stress Mitigation:</span>
                <strong className="text-emerald-800">
                  {whatIfResult.projectedStressReduction > 0 ? `-${whatIfResult.projectedStressReduction}% Stress` : 'None'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Physics Explanation of Candidate Action */}
        <div className="p-3 border-2 border-black bg-white font-mono text-xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
            Digital Twin Physics Assessment:
          </span>
          <p className="text-gray-800 leading-relaxed font-semibold">
            {whatIfResult.recommendationNote}
          </p>
        </div>

        {/* Footer & Notice */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t-2 border-black">
          <span className="text-[10px] font-mono text-gray-500">
            * Projection modeled using speed-density BSFC thermodynamics & ISO 10816 rotor dynamics.
          </span>
          <button
            onClick={onClose}
            className="neo-button bg-black text-white px-4 py-2 font-mono text-xs font-bold shadow-[2px_2px_0px_0px_#000]"
          >
            CONFIRM & RETURN TO DASHBOARD
          </button>
        </div>
      </div>
    </div>
  );
};
