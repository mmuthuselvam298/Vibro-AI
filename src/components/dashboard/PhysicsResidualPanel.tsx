import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { GuideLink } from './GuideLink';
import { JargonTooltip } from './JargonTooltip';
import { Scale, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PhysicsResidualPanel: React.FC = () => {
  const { telemetry, plainLanguageMode } = useEngineStore();

  const residualItems = [
    {
      key: 'cht',
      plainName: 'Cylinder Head Temperature',
      techName: 'Thermodynamic CHT Residual',
      expected: telemetry.cht.expected,
      actual: telemetry.cht.current,
      unit: '°C',
      physicsModel: 'Thermodynamic heat dissipation model f(RPM, manifold pressure)',
      plainExpl: 'How hot the engine cylinder gets under load. High heat means friction or cooling failure.',
      threshold: 10
    },
    {
      key: 'oilPressure',
      plainName: 'Engine Oil Pressure',
      techName: 'Hydraulic Line Pressure',
      expected: telemetry.oilPressure.expected,
      actual: telemetry.oilPressure.current,
      unit: 'bar',
      physicsModel: 'Positive displacement pump hydraulic curve f(RPM, Oil Temp)',
      plainExpl: 'Pressure pumping oil to bearings. Dropping pressure risks immediate engine seizure.',
      threshold: 0.3
    },
    {
      key: 'egt',
      plainName: 'Exhaust Heat (EGT)',
      techName: 'Stoichiometric Combustion Enthalpy',
      expected: telemetry.egt.expected,
      actual: telemetry.egt.current,
      unit: '°C',
      physicsModel: 'Combustion exhaust enthalpy balance f(fuel flow, ignition timing)',
      plainExpl: 'Heat of exhaust gas. Uneven exhaust flags misfires, air leaks, or bad injectors.',
      threshold: 30
    },
    {
      key: 'oilTemp',
      plainName: 'Oil Sump Temperature',
      techName: 'Lubrication Fluid Thermal Balance',
      expected: telemetry.oilTemp.expected,
      actual: telemetry.oilTemp.current,
      unit: '°C',
      physicsModel: 'Journal bearing friction dissipation vs oil cooler heat rejection',
      plainExpl: 'Temperature of the oil reservoir. High temps thin out oil and accelerate bearing wear.',
      threshold: 6
    },
    {
      key: 'vibrationRms',
      plainName: 'Overall Vibration Energy',
      techName: 'Broadband Vibration RMS',
      expected: telemetry.vibrationRms.expected,
      actual: telemetry.vibrationRms.current,
      unit: 'g',
      physicsModel: 'ISO 10816 baseline kinematic rotor-bearing dynamics model',
      plainExpl: 'Total vibration energy. Rising RMS indicates unbalance, looseness, or bearing wear.',
      threshold: 0.5
    },
    {
      key: 'fuelFlow',
      plainName: 'Fuel Burn Rate',
      techName: 'BSFC Volumetric Fuel Delivery',
      expected: telemetry.fuelFlow.expected,
      actual: telemetry.fuelFlow.current,
      unit: 'L/h',
      physicsModel: 'Brake Specific Fuel Consumption (BSFC) speed-density map',
      plainExpl: 'How much fuel the engine is drinking per hour. Abnormal flow flags leaks or clogged injectors.',
      threshold: 1.5
    },
  ];

  return (
    <div className="neo-card flex flex-col h-full bg-white">
      <div className="flex flex-wrap justify-between items-center mb-3 border-b-2 border-black pb-2 gap-2">
        <div className="flex items-center gap-2">
          <Scale size={18} className="stroke-[2.5]" />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-base uppercase tracking-tight">
                {plainLanguageMode ? 'Expected vs. Actual Check' : 'Physics Residual Engine'}
              </h3>
              <JargonTooltip
                term="Physics Residual Check"
                explanation="Compares what the engine should be doing based on first-principles aeronautical physics against what the sensors are actually measuring."
                analogy="Like a doctor knowing your normal resting heart rate is 70 BPM. If it spikes to 140 BPM while sitting down, the doctor knows immediately something is wrong even if you haven't collapsed."
                technicalDetails="Residual = Sensor Actual - Physical Baseline f(RPM, throttle, ambient temp, altitude). Crosses ISO 10816 and thermodynamic thresholds to trigger early warning."
              />
            </div>
            <span className="text-[10px] font-mono text-neutral-500 font-bold">
              {plainLanguageMode ? 'Physics Residual Engine (First-Principles Model)' : 'Physics-Residual Validation Model'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black bg-[var(--color-brand-yellow)] text-black">
            OBSERVED VS FIRST-PRINCIPLES
          </span>
          <GuideLink sectionId="03-system-architecture" label="Physics Model" />
        </div>
      </div>

      <div className="text-xs font-mono text-gray-600 mb-3 bg-neutral-50 p-2 border border-black">
        <span className="font-bold text-black">Why this matters: </span>
        Compares first-principles expectations against live telemetry to catch mechanical faults before traditional threshold alarms notice:
        <span className="font-bold ml-1 text-black font-mono">Residual = Actual − Expected</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {residualItems.map((item) => {
          const residual = Number((item.actual - item.expected).toFixed(2));
          const isExceeded = Math.abs(residual) >= item.threshold;
          const isWarning = Math.abs(residual) >= (item.threshold * 0.5);

          return (
            <div key={item.key} className="p-3 border-2 border-black bg-white shadow-[var(--shadow-neobrutalism-sm)]">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm uppercase">
                      {plainLanguageMode ? item.plainName : item.techName}
                    </span>
                    <JargonTooltip
                      term={item.plainName}
                      explanation={item.plainExpl}
                      technicalDetails={`Formula/Model: ${item.physicsModel}. Tolerance threshold: ±${item.threshold} ${item.unit}.`}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-gray-500 leading-tight">
                    {plainLanguageMode ? `${item.techName} • ${item.plainExpl}` : item.physicsModel}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {residual > 0 ? (
                    <span className="flex items-center text-xs font-mono font-bold text-red-600">
                      <ArrowUpRight size={14} /> +{residual}{item.unit}
                    </span>
                  ) : residual < 0 ? (
                    <span className="flex items-center text-xs font-mono font-bold text-blue-600">
                      <ArrowDownRight size={14} /> {residual}{item.unit}
                    </span>
                  ) : (
                    <span className="flex items-center text-xs font-mono font-bold text-green-600">
                      <Minus size={14} /> 0.0{item.unit}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-200 text-xs font-mono">
                <div>
                  <span className="text-gray-500 text-[10px] block">EXPECTED</span>
                  <span className="font-bold">{item.expected} {item.unit}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">OBSERVED</span>
                  <span className="font-bold">{item.actual} {item.unit}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">HEALTH IMPACT</span>
                  <span className={cn(
                    "font-bold px-1 py-0.5 border text-[10px] inline-block",
                    isExceeded ? "bg-[var(--color-brand-red)] text-white border-black" :
                    isWarning ? "bg-[var(--color-brand-yellow)] text-black border-black" :
                    "bg-[var(--color-brand-green)] text-black border-black"
                  )}>
                    {isExceeded ? "FAULT BIAS" : isWarning ? "ELEVATED" : "IN LIMITS"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
