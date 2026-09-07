import React from 'react';
import { DigitalTwin } from '@/components/dashboard/DigitalTwin';
import { ExpectedVsCurrentBars } from '@/components/dashboard/ExpectedVsCurrentBars';
import { TelemetryGrid } from '@/components/dashboard/TelemetryGrid';
import { useEngineStore } from '@/store/engineStore';
import { GuideLink } from '@/components/dashboard/GuideLink';
import { JargonTooltip } from '@/components/dashboard/JargonTooltip';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DigitalTwinPage: React.FC = () => {
  const { affectedComponent, scenario, plainLanguageMode } = useEngineStore();

  const subAssemblies = [
    {
      name: 'Main Crank Bearings (Outer/Inner Race)',
      plainName: 'Crankshaft Bearings',
      componentKey: 'BEARING',
      health: affectedComponent === 'BEARING' ? (scenario === 'SEVERE_BEARING_WEAR' ? 28 : 74) : 98,
      sensor: 'ADXL355 Triaxial (Bearing Cap Locus)',
      defectMode: 'BPFO / BPFI Spalling & Fatigue Micro-Pitting',
      plainDesc: 'Bearings supporting the rotating crankshaft. Flaking causes vibration spikes.'
    },
    {
      name: 'Pistons & Compression Rings (Cyl #1–4)',
      plainName: 'Cylinder Pistons & Rings',
      componentKey: 'PISTON',
      health: affectedComponent === 'PISTON' ? 58 : 96,
      sensor: 'CHT Thermocouple + ADXL355 Transient',
      defectMode: 'Piston Skirt Slap & Ring Micro-Welding',
      plainDesc: 'Pistons compressing fuel inside cylinders. Loose fit causes cylinder knocking.'
    },
    {
      name: 'Valve Train & Overhead Camshaft',
      plainName: 'Intake & Exhaust Valves',
      componentKey: 'VALVE',
      health: affectedComponent === 'VALVE' ? 76 : 99,
      sensor: 'EGT Probe + 4X Order Acoustic Seating',
      defectMode: 'Excessive Tappet Lash Gap & Seat Recession',
      plainDesc: 'Valves letting fuel in and exhaust out. Gap wear causes tapping noises.'
    },
    {
      name: 'Rolling Elements (Balls & Rollers)',
      plainName: 'Bearing Ball Elements',
      componentKey: 'ROLLING_ELEMENT',
      health: affectedComponent === 'ROLLING_ELEMENT' ? 42 : 97,
      sensor: 'ADXL355 BSF Harmonic Demodulation',
      defectMode: 'Ball Spin Flaking & Cage Pocket Fatigue',
      plainDesc: 'Hardened steel balls inside bearings. Chipping causes 80Hz cyclic shocks.'
    },
    {
      name: 'Fuel Injection & Rail Pressure',
      plainName: 'Fuel Injectors & Fuel Rail',
      componentKey: 'FUEL_INJECTOR',
      health: affectedComponent === 'FUEL_INJECTOR' ? (scenario === 'MISFIRE' ? 48 : 62) : 99,
      sensor: 'Fuel Flow Turbine + Crank Angle Encoder',
      defectMode: 'Injector Clogging, Timing Offset & Misfire',
      plainDesc: 'Spraying pressurized fuel into cylinders. Clogging causes engine hesitations.'
    },
    {
      name: 'Lubrication Pump & Sump Gallery',
      plainName: 'Oil Pump & Oil Sump',
      componentKey: 'OIL_SYSTEM',
      health: affectedComponent === 'OIL_SYSTEM' ? 35 : 95,
      sensor: 'Oil Pressure Transducer + RTD Oil Temp',
      defectMode: 'Scavenge Loss, Cavitation & Hydrodynamic Breakdown',
      plainDesc: 'Pumps pressurized oil to moving parts. Loss of oil pressure leads to engine seizure.'
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto animate-in fade-in duration-300 pb-12">
      <div className="flex flex-wrap justify-between items-center border-b-4 border-black pb-2 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold uppercase tracking-tight">
              {plainLanguageMode ? 'Engine Map (Interactive Digital Twin)' : 'Interactive Digital Twin'}
            </h2>
            <JargonTooltip
              term="Interactive Digital Twin"
              explanation="A dynamic computational replica of the UAV engine that highlights in real-time which specific physical component is degrading."
              analogy="Like an interactive 3D model of the human body that lights up red over an injured joint."
              technicalDetails="Kinematic coordinates mapped to 4-cylinder boxer engine layout (Rotax 912 architecture). Directly reflects sensor residual deviations."
            />
          </div>
          <p className="text-xs font-mono text-gray-600 mt-1">
            {plainLanguageMode
              ? 'Visual diagram of the engine — shows exactly where mechanical wear or thermal stress is occurring.'
              : 'Spatial 2D/3D kinematic and thermodynamic model mapping telemetry residuals directly onto physical engine sub-assemblies.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="neo-badge bg-[var(--color-brand-green)] text-black">
            STATE SYNCHRONIZED
          </span>
          <GuideLink sectionId="11-digital-twin" label="Twin Architecture" />
        </div>
      </div>

      {/* Main Schematic & Spatial Locus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DigitalTwin />

        {/* Sub-Assembly Health Ledger */}
        <div className="neo-card bg-white flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3 border-b-4 border-black pb-2">
            <h3 className="font-bold text-xl uppercase flex items-center gap-2">
              <Layers size={20} /> Sub-Assembly Health Breakdown
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 border border-black bg-gray-100">
              6 CORE ASSEMBLES
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[320px] pr-1">
            {subAssemblies.map((sub, i) => {
              const isFaulty = affectedComponent === sub.componentKey;
              return (
                <div
                  key={i}
                  className={cn(
                    "p-2.5 border-2 border-black transition-all",
                    isFaulty ? "bg-red-50 border-red-600 shadow-[var(--shadow-neobrutalism-sm)]" : "bg-gray-50 hover:bg-white"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs uppercase">{sub.name}</span>
                    <span className={cn(
                      "font-mono font-bold text-xs px-1.5 py-0.2 border",
                      isFaulty ? "bg-[var(--color-brand-red)] text-white border-black" : "bg-green-100 text-green-900 border-black"
                    )}>
                      {sub.health}% HEALTH
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-gray-600 mt-1">
                    <div><strong>Sensor:</strong> {sub.sensor}</div>
                    <div><strong>Defect Mode:</strong> {sub.defectMode}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t-2 border-black text-[10px] font-mono text-gray-500">
            * Spatial twin synchronizes at 20 Hz from fused CAN bus state vectors.
          </div>
        </div>
      </div>

      {/* Expected Healthy State vs Current Live Engine */}
      <ExpectedVsCurrentBars />

      {/* Synchronized Telemetry Parameters */}
      <TelemetryGrid />
    </div>
  );
};
