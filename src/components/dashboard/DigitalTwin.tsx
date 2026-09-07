import React, { useState } from 'react';
import { useEngineStore, type ComponentType } from '@/store/engineStore';
import { computeAdaptiveBaseline } from '@/lib/physicsBaseline';
import { GuideLink } from './GuideLink';
import { Eye, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DigitalTwin: React.FC = () => {
  const { affectedComponent, telemetry, inferenceLatency, missionProfile } = useEngineStore();
  const [selectedSubAssembly, setSelectedSubAssembly] = useState<ComponentType>(
    affectedComponent !== 'NONE' ? affectedComponent : 'BEARING'
  );

  // Auto-switch to affected component when scenario changes
  React.useEffect(() => {
    if (affectedComponent !== 'NONE') {
      setSelectedSubAssembly(affectedComponent);
    }
  }, [affectedComponent]);

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

  const p = baseline.parameters;

  const getHighlightClass = (comp: ComponentType) => {
    const isLocus = affectedComponent === comp;
    const isSelected = selectedSubAssembly === comp;

    if (isLocus) {
      return 'fill-[var(--color-brand-red)] stroke-black stroke-[4px] animate-pulse cursor-pointer';
    }
    if (isSelected) {
      return 'fill-[var(--color-brand-yellow)] stroke-black stroke-[3px] cursor-pointer';
    }
    return 'fill-white stroke-black stroke-[3px] hover:fill-neutral-100 transition-colors cursor-pointer';
  };

  const getSensorClass = (comp: ComponentType) => {
    return affectedComponent === comp
      ? 'fill-[var(--color-brand-yellow)] stroke-black stroke-[3px] animate-bounce'
      : 'fill-[var(--color-brand-blue)] stroke-black stroke-[2px]';
  };

  // Component Live Telemetry Metadata
  const getComponentTelemetry = (comp: ComponentType) => {
    switch (comp) {
      case 'BEARING':
      case 'ROLLING_ELEMENT':
        return {
          name: 'Main Crank Journal Bearings',
          expectedVal: `${p.vibrationRms.expected} g`,
          currentVal: `${p.vibrationRms.current} g`,
          deviation: p.vibrationRms.deviationPercent,
          health: affectedComponent === 'BEARING' || affectedComponent === 'ROLLING_ELEMENT' ? 68 : 98,
          trend: affectedComponent === 'BEARING' ? 'DEGRADING (BPFO)' : 'STABLE',
          estRul: affectedComponent === 'BEARING' ? '88 Cycles' : '185 Cycles',
        };
      case 'PISTON':
      case 'COOLING_SYSTEM':
        return {
          name: 'Cylinder #1–4 & Piston Skirts',
          expectedVal: `${p.cht.expected} °C`,
          currentVal: `${p.cht.current} °C`,
          deviation: p.cht.deviationPercent,
          health: affectedComponent === 'PISTON' ? 58 : 96,
          trend: affectedComponent === 'PISTON' ? 'DEGRADING (Slap)' : 'NOMINAL',
          estRul: affectedComponent === 'PISTON' ? '72 Cycles' : '185 Cycles',
        };
      case 'VALVE':
        return {
          name: 'Overhead Valve Train (Intake/Exh)',
          expectedVal: '4X Harmonic Normal',
          currentVal: `${p.egt.current} °C`,
          deviation: p.egt.deviationPercent,
          health: affectedComponent === 'VALVE' ? 74 : 99,
          trend: affectedComponent === 'VALVE' ? 'LASH EXCESS' : 'NOMINAL',
          estRul: affectedComponent === 'VALVE' ? '110 Cycles' : '185 Cycles',
        };
      case 'OIL_SYSTEM':
        return {
          name: 'Hydrodynamic Lubrication Gallery',
          expectedVal: `${p.oilPressure.expected} bar`,
          currentVal: `${p.oilPressure.current} bar`,
          deviation: p.oilPressure.deviationPercent,
          health: affectedComponent === 'OIL_SYSTEM' ? 35 : 97,
          trend: affectedComponent === 'OIL_SYSTEM' ? 'PRESSURE DROP' : 'STABLE',
          estRul: affectedComponent === 'OIL_SYSTEM' ? '32 Cycles' : '185 Cycles',
        };
      case 'FUEL_INJECTOR':
        return {
          name: 'Common Rail & Fuel Injectors',
          expectedVal: `${p.fuelFlow.expected} L/h`,
          currentVal: `${p.fuelFlow.current} L/h`,
          deviation: p.fuelFlow.deviationPercent,
          health: affectedComponent === 'FUEL_INJECTOR' ? 62 : 99,
          trend: affectedComponent === 'FUEL_INJECTOR' ? 'IMBALANCE' : 'NOMINAL',
          estRul: affectedComponent === 'FUEL_INJECTOR' ? '95 Cycles' : '185 Cycles',
        };
      case 'SENSOR_ADXL':
        return {
          name: 'ADXL355 Accelerometer Transducer',
          expectedVal: '0.00g DC Offset',
          currentVal: '+1.10g DC Offset',
          deviation: 110,
          health: 64,
          trend: 'SENSOR DRIFT',
          estRul: 'N/A (Recalibrate)',
        };
      default:
        return {
          name: 'Powertrain Structural Assembly',
          expectedVal: 'Nominal Envelope',
          currentVal: 'Synchronized',
          deviation: 0,
          health: 98,
          trend: 'STABLE',
          estRul: '185 Cycles',
        };
    }
  };

  const compData = getComponentTelemetry(selectedSubAssembly);

  return (
    <div className="neo-card flex flex-col h-[480px] bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
      {/* Header with Digital Twin Sync Status */}
      <div className="flex flex-wrap justify-between items-center mb-3 border-b-4 border-black pb-2 gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-xl uppercase tracking-tight">
            Digital Twin (Live State)
          </h3>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-black bg-emerald-100 text-emerald-900 flex items-center gap-1">
            <Radio size={12} className="text-emerald-700 animate-pulse" />
            <span>SYNCED ({inferenceLatency}ms)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="border-2 border-black px-2 py-0.5 font-mono font-extrabold text-[11px] bg-white shadow-[2px_2px_0px_0px_#000]">
            VIEW: FRONT AXIAL
          </div>
          <GuideLink sectionId="11-digital-twin" label="Twin Guide" />
        </div>
      </div>

      {/* Main Schematic Body */}
      <div className="flex-1 bg-[var(--color-brand-light)] border-4 border-black relative overflow-hidden flex items-center justify-center p-2">
        {/* Technical Schematic SVG of UAV 4-Stroke Piston Engine */}
        <svg viewBox="0 0 450 360" className="w-full h-full max-h-full drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <g transform="translate(45, 20)">
            {/* Cooling Shroud & Fins */}
            <g
              className={getHighlightClass('COOLING_SYSTEM')}
              onClick={() => setSelectedSubAssembly('COOLING_SYSTEM')}
            >
              <rect x="50" y="45" width="260" height="14" className="stroke-black stroke-[2px]" />
              <rect x="50" y="70" width="260" height="14" className="stroke-black stroke-[2px]" />
              <rect x="50" y="95" width="260" height="14" className="stroke-black stroke-[2px]" />
              <rect x="50" y="120" width="260" height="14" className="stroke-black stroke-[2px]" />
            </g>

            {/* Cylinder Block */}
            <path d="M70 40 L290 40 L290 220 L70 220 Z" className="fill-white stroke-black stroke-[4px]" />

            {/* Cylinder Bore Liner */}
            <rect x="110" y="50" width="140" height="160" className="fill-gray-50 stroke-black stroke-[2px] stroke-dashed" />

            {/* Valve Train */}
            <g
              className={getHighlightClass('VALVE')}
              onClick={() => setSelectedSubAssembly('VALVE')}
            >
              <rect x="130" y="10" width="18" height="42" />
              <rect x="210" y="10" width="18" height="42" />
              <path d="M110 10 L250 10" className="stroke-black stroke-[6px]" />
              <path d="M125 50 L153 50" className="stroke-black stroke-[4px]" />
              <path d="M205 50 L233 50" className="stroke-black stroke-[4px]" />
            </g>

            {/* Fuel Injector Rail */}
            <g
              className={getHighlightClass('FUEL_INJECTOR')}
              onClick={() => setSelectedSubAssembly('FUEL_INJECTOR')}
            >
              <rect x="170" y="2" width="20" height="38" />
              <polygon points="175,40 185,40 180,48" className="fill-black stroke-black" />
            </g>

            {/* Piston Body & Rings */}
            <g
              className={getHighlightClass('PISTON')}
              onClick={() => setSelectedSubAssembly('PISTON')}
            >
              <rect x="120" y="75" width="120" height="65" rx="3" />
              <line x1="120" y1="88" x2="240" y2="88" className="stroke-black stroke-[3px]" />
              <line x1="120" y1="102" x2="240" y2="102" className="stroke-black stroke-[3px]" />
              <line x1="120" y1="116" x2="240" y2="116" className="stroke-black stroke-[2px]" />
              <circle cx="180" cy="115" r="10" className="fill-gray-300 stroke-black stroke-[2px]" />
            </g>

            {/* Connecting Rod */}
            <line x1="180" y1="115" x2="180" y2="240" className="stroke-black stroke-[8px]" />

            {/* Oil Pan / Sump */}
            <g
              className={getHighlightClass('OIL_SYSTEM')}
              onClick={() => setSelectedSubAssembly('OIL_SYSTEM')}
            >
              <path d="M60 220 L300 220 L275 285 L85 285 Z" className="stroke-black stroke-[3px]" />
              <line x1="85" y1="260" x2="275" y2="260" className="stroke-blue-700 stroke-[3px] stroke-dashed" />
            </g>

            {/* Crankcase & Crank Web */}
            <circle cx="180" cy="240" r="42" className="fill-white stroke-black stroke-[4px]" />

            {/* Main Bearings */}
            <circle
              cx="180"
              cy="240"
              r="18"
              className={getHighlightClass('BEARING')}
              onClick={() => setSelectedSubAssembly('BEARING')}
            />
            <circle
              cx="115"
              cy="240"
              r="16"
              className={getHighlightClass('BEARING')}
              onClick={() => setSelectedSubAssembly('BEARING')}
            />
            <circle
              cx="245"
              cy="240"
              r="16"
              className={getHighlightClass('BEARING')}
              onClick={() => setSelectedSubAssembly('BEARING')}
            />

            {/* Rolling Elements */}
            <g
              className={getHighlightClass('ROLLING_ELEMENT')}
              onClick={() => setSelectedSubAssembly('ROLLING_ELEMENT')}
            >
              <circle cx="180" cy="225" r="4" />
              <circle cx="180" cy="255" r="4" />
              <circle cx="165" cy="240" r="4" />
              <circle cx="195" cy="240" r="4" />
            </g>

            {/* Sensor Tap Loci */}
            <g>
              <circle
                cx="245"
                cy="215"
                r="6"
                className={getSensorClass('SENSOR_ADXL')}
                onClick={() => setSelectedSubAssembly('SENSOR_ADXL')}
              />
              <circle cx="100" cy="60" r="6" className="fill-orange-500 stroke-black stroke-[2px]" />
              <circle cx="260" cy="40" r="6" className="fill-red-500 stroke-black stroke-[2px]" />
              <circle cx="75" cy="250" r="6" className="fill-blue-500 stroke-black stroke-[2px]" />
            </g>
          </g>
        </svg>

        {/* View Badge */}
        <div className="absolute top-3 left-3 bg-white border-2 border-black px-2 py-1 font-mono text-[10px] font-bold flex items-center gap-1 shadow-[var(--shadow-neobrutalism-sm)]">
          <Eye size={12} />
          <span>CYLINDER #1-4 AXIAL CUT</span>
        </div>

        {/* Isolated Component Notification */}
        {affectedComponent !== 'NONE' ? (
          <div className="absolute bottom-3 right-3 bg-[var(--color-brand-red)] text-white border-2 border-black px-3 py-1 font-bold text-xs shadow-[var(--shadow-neobrutalism-sm)] animate-bounce">
            FAULT LOCUS: {affectedComponent}
          </div>
        ) : (
          <div className="absolute bottom-3 right-3 bg-[var(--color-brand-green)] text-black border-2 border-black px-3 py-1 font-bold text-xs shadow-[var(--shadow-neobrutalism-sm)]">
            ALL COMPONENTS NOMINAL
          </div>
        )}
      </div>

      {/* LIVE COMPONENT TELEMETRY BAR: EXPECTED VS CURRENT FOR SELECTED SUB-ASSEMBLY */}
      <div className="mt-3 p-2.5 border-2 border-black bg-neutral-100 font-mono text-xs flex flex-wrap items-center justify-between gap-3 shadow-[var(--shadow-neobrutalism-sm)]">
        <div>
          <span className="text-[10px] font-bold uppercase text-gray-500 block">
            SELECTED SUB-ASSEMBLY (CLICK SVG TO INSPECT):
          </span>
          <strong className="text-black text-sm uppercase">{compData.name}</strong>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-[9px] text-gray-500 block">HEALTHY EXPECTED:</span>
            <strong>{compData.expectedVal}</strong>
          </div>
          <div>
            <span className="text-[9px] text-gray-500 block">CURRENT LIVE:</span>
            <strong className={cn(
              compData.health < 60 ? "text-red-700 font-extrabold" : "text-black"
            )}>
              {compData.currentVal}
            </strong>
          </div>
          <div>
            <span className="text-[9px] text-gray-500 block">HEALTH:</span>
            <span className={cn(
              "px-1.5 py-0.2 border text-[10px] font-bold",
              compData.health < 60 ? "bg-red-100 text-red-900 border-black" : "bg-green-100 text-green-900 border-black"
            )}>
              {compData.health}%
            </span>
          </div>
          <div>
            <span className="text-[9px] text-gray-500 block">EST. RUL:</span>
            <strong>{compData.estRul}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
