import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { GuideLink } from './GuideLink';
import { Target, CheckCircle2 } from 'lucide-react';

export const DiagnosisPanel: React.FC = () => {
  const { faultType, confidence, scenario, evidencePoints } = useEngineStore();

  const getAlternativeHypotheses = () => {
    if (scenario === 'HEALTHY') {
      return [
        { label: 'Healthy Baseline', val: confidence },
        { label: 'Early Bearing Wear', val: Math.max(0.2, (100 - confidence) * 0.45) },
        { label: 'Piston Slap', val: Math.max(0.1, (100 - confidence) * 0.3) },
        { label: 'Sensor Drift', val: Math.max(0.1, (100 - confidence) * 0.25) },
      ];
    }

    return [
      { label: faultType, val: confidence },
      { label: 'Healthy Baseline', val: Math.max(0.1, (100 - confidence) * 0.15) },
      { label: 'Alternative Component Degradation', val: Math.max(0.2, (100 - confidence) * 0.55) },
      { label: 'Sensor Channel Anomaly', val: Math.max(0.1, (100 - confidence) * 0.30) },
    ];
  };

  const hypotheses = getAlternativeHypotheses();

  return (
    <div className="neo-card h-full flex flex-col bg-white">
      <div className="flex flex-wrap justify-between items-center mb-3 border-b-2 border-black pb-2 gap-2">
        <div className="flex items-center gap-2">
          <Target size={18} className="stroke-[2.5]" />
          <h3 className="font-extrabold text-base uppercase tracking-tight">AI Fault Diagnosis</h3>
        </div>
        <div className="flex items-center gap-2">
          <GuideLink sectionId="07-ai-fault-diagnosis" label="AI Architecture" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Primary Classification */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-1">
            Top Classifier Prediction (Softmax Output)
          </div>
          <div className="bg-[var(--color-brand-light)] border-4 border-black p-3">
            <div className="flex justify-between items-end mb-1">
              <span className="font-bold text-base sm:text-lg leading-tight">{faultType}</span>
              <span className="font-mono font-bold text-xl">{confidence.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-300 h-2.5 border-2 border-black">
              <div className="h-full bg-black transition-all" style={{ width: `${confidence}%` }} />
            </div>
          </div>
        </div>

        {/* Alternative Hypotheses */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">
            Posterior Probability Distribution
          </div>
          <div className="space-y-1.5 font-mono text-xs">
            {hypotheses.slice(1).map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-32 sm:w-40 truncate font-semibold" title={p.label}>
                  {p.label}
                </div>
                <div className="flex-1 bg-gray-200 h-2 border border-black">
                  <div className="h-full bg-gray-600" style={{ width: `${Math.min(100, p.val * 3)}%` }} />
                </div>
                <div className="w-12 text-right font-bold">{p.val.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Explainable Evidence */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-bold text-gray-500 uppercase">
              Multi-Domain Diagnostic Evidence
            </div>
            <GuideLink sectionId="08-fault-signatures" label="Signatures" />
          </div>
          <ul className="space-y-1.5">
            {evidencePoints.map((ev, i) => (
              <li key={i} className="flex items-start gap-2 text-xs font-bold bg-gray-50 border-2 border-black p-2">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-[var(--color-brand-blue)]" />
                <span className="leading-tight">{ev}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
