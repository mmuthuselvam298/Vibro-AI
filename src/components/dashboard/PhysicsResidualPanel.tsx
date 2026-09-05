import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { GuideLink } from './GuideLink';
import { Scale, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PhysicsResidualPanel: React.FC = () => {
  const { telemetry } = useEngineStore();

  const residualItems = [
    {
      key: 'cht',
      name: 'Cylinder Head Temp',
      expected: telemetry.cht.expected,
      actual: telemetry.cht.current,
      unit: '°C',
      physicsModel: 'Thermodynamic heat dissipation model based on RPM & manifold load',
      threshold: 10
    },
    {
      key: 'oilPressure',
      name: 'Oil Hydrostatic Pressure',
      expected: telemetry.oilPressure.expected,
      actual: telemetry.oilPressure.current,
      unit: 'bar',
      physicsModel: 'Positive displacement pump hydraulic curve f(RPM, Oil Temp)',
      threshold: 0.3
    },
    {
      key: 'egt',
      name: 'Exhaust Gas Temp',
      expected: telemetry.egt.expected,
      actual: telemetry.egt.current,
      unit: '°C',
      physicsModel: 'Stoichiometric combustion enthalpy balance',
      threshold: 30
    },
    {
      key: 'oilTemp',
      name: 'Oil Sump Temperature',
      expected: telemetry.oilTemp.expected,
      actual: telemetry.oilTemp.current,
      unit: '°C',
      physicsModel: 'Journal friction heat generation vs cooler heat rejection',
      threshold: 6
    },
    {
      key: 'vibrationRms',
      name: 'Vibration RMS Energy',
      expected: telemetry.vibrationRms.expected,
      actual: telemetry.vibrationRms.current,
      unit: 'g',
      physicsModel: 'ISO 10816 baseline kinematic rotor-bearing dynamics model',
      threshold: 0.5
    },
    {
      key: 'fuelFlow',
      name: 'Fuel Consumption Rate',
      expected: telemetry.fuelFlow.expected,
      actual: telemetry.fuelFlow.current,
      unit: 'L/h',
      physicsModel: 'Brake Specific Fuel Consumption (BSFC) speed-density map',
      threshold: 1.5
    },
  ];

  return (
    <div className="neo-card flex flex-col h-full bg-white">
      <div className="flex flex-wrap justify-between items-center mb-3 border-b-2 border-black pb-2 gap-2">
        <div className="flex items-center gap-2">
          <Scale size={18} className="stroke-[2.5]" />
          <h3 className="font-extrabold text-base uppercase tracking-tight">Physics Residual Engine</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black bg-[var(--color-brand-yellow)] text-black">
            OBSERVED VS FIRST-PRINCIPLES
          </span>
          <GuideLink sectionId="03-system-architecture" label="Physics Model" />
        </div>
      </div>

      <div className="text-xs font-mono text-gray-600 mb-3">
        Residuals quantify deviation between real-time sensor observations and the first-principles digital twin physics model:
        <span className="font-bold ml-1 text-black">Residual = Actual − Expected</span>
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
                  <span className="font-bold text-sm uppercase">{item.name}</span>
                  <p className="text-[10px] font-mono text-gray-500 leading-tight">{item.physicsModel}</p>
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
