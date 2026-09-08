import React, { useState } from 'react';
import { useEngineStore } from '@/store/engineStore';
import { Sparkles, X, ChevronRight, ChevronLeft, CheckCircle2, ShieldAlert, Activity, Compass, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { engineHealth, alertStatus, faultType, rul } = useEngineStore();

  if (!isOpen) return null;

  const tourSteps = [
    {
      title: 'Step 1: Is the Engine Okay Right Now?',
      icon: <Activity size={24} className="text-black" />,
      headline: `Current Engine Health is ${engineHealth.toFixed(1)}% (${alertStatus})`,
      explanation:
        'The very first thing an operator or engineer evaluates: what is the decision-support health status of this UAV engine? Unlike traditional threshold warning lights that only buzz after catastrophic damage, Vibro-AI continuously scores health from 0% to 100%.',
      whatToLookFor: 'Look at the top-left ENGINE HEALTH card. Green (>85%) indicates nominal condition; Yellow (40–85%) indicates early degradation; Red (<40%) recommends immediate review.',
      badge: 'HEALTH SCORE',
    },
    {
      title: 'Step 2: What is the Engine Actually Doing?',
      icon: <CheckCircle2 size={24} className="text-black" />,
      headline: 'Expected Healthy State vs Current Live Engine',
      explanation:
        'Our core principle: "We do not wait for a parameter to become dangerous. We detect when the engine stops behaving like a healthy engine." For all 7 key sensors, two visual bars show what the engine SHOULD be doing under current weather/load vs what it IS doing.',
      whatToLookFor: 'Look at the dual comparison bars below the metrics. Top bar = Healthy Expected baseline; Bottom bar = Live telemetry. Any mismatch highlights early.',
      badge: 'ADAPTIVE COMPARISON',
    },
    {
      title: 'Step 3: What Caused the Problem? (Evidence)',
      icon: <ShieldAlert size={24} className="text-black" />,
      headline: `Active Diagnosis: ${faultType === 'None (Nominal Operation)' ? 'All Systems Normal' : faultType}`,
      explanation:
        'Instead of an opaque "AI black box", the system explains its decision: it combines high-frequency vibration signals (the mechanical fingerprint) with temperature, oil pressure, and fuel flow to demonstrate candidate fault consistency.',
      whatToLookFor: 'See the "Why Did The System Flag This?" panel. It lists the top contributing sensor deviations so operators know exactly which part is wearing out.',
      badge: 'EXPLAINABLE AI',
    },
    {
      title: 'Step 4: How Much Time is Left? (RUL)',
      icon: <Compass size={24} className="text-black" />,
      headline: `Estimated Time Left: ${rul} Operating Cycles`,
      explanation:
        'Operators need decision support to schedule turnaround maintenance. The prognostics engine calculates prototype Remaining Useful Life (RUL) estimates with confidence bands and degradation margins.',
      whatToLookFor: 'Look at the Est. RUL card and the Mission Timeline clock. It compares the required mission time vs the estimated operating margin before reaching maintenance limits.',
      badge: 'RUL FORECAST',
    },
    {
      title: 'Step 5: What Should the Operator Do?',
      icon: <Wrench size={24} className="text-black" />,
      headline: 'Actionable Advice & What-If Simulation',
      explanation:
        'The system doesn’t just show alerts — it provides actionable decision support: "Continue Monitoring", "Reduce Load by 15%", or "Priority Review". Operators can even evaluate candidate operational adjustments inside the interactive "What-If" simulator.',
      whatToLookFor: 'Check the Operator Advisory card and click the "What-If Simulation" button to see how throttling back 15% immediately extends estimated component life.',
      badge: 'DECISION SUPPORT',
    },
  ];

  const step = tourSteps[currentStep];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="neo-card bg-white border-4 border-black w-full max-w-2xl flex flex-col p-6 shadow-[8px_8px_0px_0px_#000] relative text-black">
        {/* Header */}
        <div className="flex justify-between items-center border-b-4 border-black pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={22} className="text-black shrink-0" />
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500 block">
                60-SECOND JUDGE WALKTHROUGH
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight leading-none">
                {step.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-black bg-neutral-100 hover:bg-black hover:text-white transition-colors"
            title="Close Tour"
            aria-label="Close Tour"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Pills */}
        <div className="flex gap-1.5 mb-4">
          {tourSteps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={cn(
                "flex-1 h-2 border border-black transition-all",
                idx === currentStep
                  ? "bg-black"
                  : idx < currentStep
                  ? "bg-[var(--color-brand-green)]"
                  : "bg-neutral-200 hover:bg-neutral-300"
              )}
              title={`Go to step ${idx + 1}`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Main Content Box */}
        <div className="p-4 border-2 border-black bg-[var(--color-brand-light)] font-mono space-y-3 mb-4 shadow-[2px_2px_0px_0px_#000]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold px-2 py-0.5 border border-black bg-white">
              {step.badge}
            </span>
            <span className="text-xs font-bold text-neutral-600">
              {currentStep + 1} of {tourSteps.length}
            </span>
          </div>

          <h3 className="font-extrabold text-base sm:text-lg text-black leading-snug">
            {step.headline}
          </h3>

          <p className="text-xs text-neutral-800 leading-relaxed font-medium">
            {step.explanation}
          </p>

          <div className="p-2.5 bg-white border border-black text-xs">
            <strong className="text-black uppercase text-[11px] block mb-0.5">Where to look on screen:</strong>
            <span className="text-neutral-700">{step.whatToLookFor}</span>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-2 border-t-2 border-black font-mono">
          <button
            onClick={onClose}
            className="text-xs font-bold text-neutral-600 hover:text-black underline px-2 py-1"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 text-xs font-bold border-2 border-black bg-white hover:bg-neutral-100 flex items-center gap-1 shadow-[2px_2px_0px_0px_#000]"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-1.5 text-xs font-bold border-2 border-black bg-black text-white hover:bg-neutral-800 flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000]"
            >
              <span>{currentStep === tourSteps.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
