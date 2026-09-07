import React from 'react';
import { Swords, XCircle, CheckCircle2 } from 'lucide-react';

export const TraditionalVsVibroCard: React.FC = () => {
  return (
    <div className="neo-card bg-white border-4 border-black p-4 sm:p-5 flex flex-col gap-3 shadow-[4px_4px_0px_0px_#000]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2">
        <div className="flex items-center gap-2">
          <Swords size={20} className="text-black stroke-[2.5]" />
          <div>
            <h3 className="font-extrabold text-base uppercase tracking-tight font-mono text-black">
              Why Not Simple Thresholds? (Traditional vs VIBRO-AI)
            </h3>
            <span className="text-[10px] font-mono text-neutral-500 uppercase">
              THE CORE HACKATHON INNOVATION EXPLAINED IN 10 SECONDS
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-black bg-[var(--color-brand-yellow)] text-black">
          SIH26054 KEY ADVANTAGE
        </span>
      </div>

      {/* Side-by-Side Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        {/* Column 1: Traditional Systems */}
        <div className="p-3.5 border-2 border-black bg-red-50/70 flex flex-col justify-between shadow-[2px_2px_0px_0px_#000]">
          <div>
            <div className="flex items-center gap-1.5 text-red-900 font-extrabold text-sm uppercase mb-2 border-b border-red-200 pb-1">
              <XCircle size={16} className="text-red-700 shrink-0" />
              <span>Traditional Cockpit Thresholds</span>
            </div>
            <ul className="space-y-2 text-[11px] text-neutral-800">
              <li className="flex items-start gap-1.5">
                <span className="text-red-600 font-bold">•</span>
                <span><strong>Fixed Alarm Limits:</strong> Only sounds the buzzer after vibration exceeds dangerous levels (&gt;2.5g). By then, bearing is already destroyed.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-red-600 font-bold">•</span>
                <span><strong>Frequent False Alarms:</strong> Flags normal hot-weather takeoff temperatures (+45°C ambient) as engine fires, causing unnecessary aborted missions.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-red-600 font-bold">•</span>
                <span><strong>No Predictive Warning:</strong> Provides zero estimate of remaining safe flight time (RUL). Pilots must guess if they can make it back to base.</span>
              </li>
            </ul>
          </div>
          <div className="mt-3 pt-2 border-t border-red-200 text-[10px] text-red-900 font-bold">
            OUTCOME: In-flight engine seizure, lost drones, costly groundings.
          </div>
        </div>

        {/* Column 2: VIBRO-AI Fusion */}
        <div className="p-3.5 border-2 border-black bg-emerald-50/70 flex flex-col justify-between shadow-[2px_2px_0px_0px_#000]">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-sm uppercase mb-2 border-b border-emerald-200 pb-1">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
              <span>VIBRO-AI Digital Twin Solution</span>
            </div>
            <ul className="space-y-2 text-[11px] text-neutral-800">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-700 font-bold">•</span>
                <span><strong>Adaptive Healthy Baseline:</strong> Continuously checks: <em>&quot;Does this engine behave like a healthy engine right now under current weather and RPM?&quot;</em></span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-700 font-bold">•</span>
                <span><strong>Zero False Alarms:</strong> Baseline automatically accounts for hot weather or thin altitude air before evaluating residuals.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-700 font-bold">•</span>
                <span><strong>Prognostics & Safe Horizon:</strong> Calculates precise Remaining Useful Life (RUL) and warns 30–80 flight hours ahead so maintenance is scheduled normally.</span>
              </li>
            </ul>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-200 text-[10px] text-emerald-900 font-bold">
            OUTCOME: 100% mission safety, condition-based turnaround, zero lost airframes.
          </div>
        </div>
      </div>
    </div>
  );
};
