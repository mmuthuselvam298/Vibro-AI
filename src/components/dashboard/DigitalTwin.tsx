import React from 'react';
import { useEngineStore, type ComponentType } from '@/store/engineStore';
import { GuideLink } from './GuideLink';
import { Eye } from 'lucide-react';

export const DigitalTwin: React.FC = () => {
  const { affectedComponent, telemetry } = useEngineStore();

  const getHighlightClass = (comp: ComponentType) => {
    return affectedComponent === comp
      ? 'fill-[var(--color-brand-red)] stroke-black stroke-[4px] animate-pulse'
      : 'fill-white stroke-black stroke-[3px] hover:fill-gray-100 transition-colors';
  };

  const getSensorClass = (comp: ComponentType) => {
    return affectedComponent === comp
      ? 'fill-[var(--color-brand-yellow)] stroke-black stroke-[3px] animate-bounce'
      : 'fill-[var(--color-brand-blue)] stroke-black stroke-[2px]';
  };

  return (
    <div className="neo-card flex flex-col h-[420px] bg-white">
      <div className="flex flex-wrap justify-between items-center mb-3 border-b-4 border-black pb-2 gap-2">
        <h3 className="font-extrabold text-xl uppercase tracking-tight">Digital Twin</h3>
        <div className="flex items-center gap-2">
          <div className="border-2 border-black px-2.5 py-1 font-mono font-extrabold text-xs bg-white shadow-[2px_2px_0px_0px_#000]">
            VIEW: FRONT SECTION
          </div>
          <GuideLink sectionId="11-digital-twin" label="Twin Guide" />
        </div>
      </div>

      <div className="flex-1 bg-[var(--color-brand-light)] border-4 border-black relative overflow-hidden flex items-center justify-center p-2">

        {/* Technical Schematic SVG of UAV 4-Stroke Piston Engine */}
        <svg viewBox="0 0 450 360" className="w-full h-full max-h-full drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <g transform="translate(45, 20)">

            {/* Cooling Shroud & Fins (Cooling System) */}
            <g className={getHighlightClass('COOLING_SYSTEM')}>
              <rect x="50" y="45" width="260" height="14" className="stroke-black stroke-[2px]" />
              <rect x="50" y="70" width="260" height="14" className="stroke-black stroke-[2px]" />
              <rect x="50" y="95" width="260" height="14" className="stroke-black stroke-[2px]" />
              <rect x="50" y="120" width="260" height="14" className="stroke-black stroke-[2px]" />
            </g>

            {/* Cylinder Block */}
            <path d="M70 40 L290 40 L290 220 L70 220 Z" className="fill-white stroke-black stroke-[4px]" />

            {/* Cylinder Bore Liner */}
            <rect x="110" y="50" width="140" height="160" className="fill-gray-50 stroke-black stroke-[2px] stroke-dashed" />

            {/* Valve Train (Intake & Exhaust) */}
            <g className={getHighlightClass('VALVE')}>
              {/* Valve guides & stems */}
              <rect x="130" y="10" width="18" height="42" />
              <rect x="210" y="10" width="18" height="42" />
              {/* Rocker arm bridge */}
              <path d="M110 10 L250 10" className="stroke-black stroke-[6px]" />
              {/* Valve poppet heads */}
              <path d="M125 50 L153 50" className="stroke-black stroke-[4px]" />
              <path d="M205 50 L233 50" className="stroke-black stroke-[4px]" />
            </g>

            {/* Fuel Injector Rail */}
            <g className={getHighlightClass('FUEL_INJECTOR')}>
              <rect x="170" y="2" width="20" height="38" />
              <polygon points="175,40 185,40 180,48" className="fill-black stroke-black" />
            </g>

            {/* Piston Body & Rings */}
            <g className={getHighlightClass('PISTON')}>
              <rect x="120" y="75" width="120" height="65" rx="3" />
              {/* Compression & Oil scraper rings */}
              <line x1="120" y1="88" x2="240" y2="88" className="stroke-black stroke-[3px]" />
              <line x1="120" y1="102" x2="240" y2="102" className="stroke-black stroke-[3px]" />
              <line x1="120" y1="116" x2="240" y2="116" className="stroke-black stroke-[2px]" />
              {/* Wrist pin */}
              <circle cx="180" cy="115" r="10" className="fill-gray-300 stroke-black stroke-[2px]" />
            </g>

            {/* Connecting Rod */}
            <line x1="180" y1="115" x2="180" y2="240" className="stroke-black stroke-[8px]" />

            {/* Oil Pan / Sump (Oil System) */}
            <g className={getHighlightClass('OIL_SYSTEM')}>
              <path d="M60 220 L300 220 L275 285 L85 285 Z" className="stroke-black stroke-[3px]" />
              <line x1="85" y1="260" x2="275" y2="260" className="stroke-blue-700 stroke-[3px] stroke-dashed" />
            </g>

            {/* Crankcase & Crank Web */}
            <circle cx="180" cy="240" r="42" className="fill-white stroke-black stroke-[4px]" />

            {/* Main Bearings */}
            <circle cx="180" cy="240" r="18" className={getHighlightClass('BEARING')} />
            <circle cx="115" cy="240" r="16" className={getHighlightClass('BEARING')} />
            <circle cx="245" cy="240" r="16" className={getHighlightClass('BEARING')} />

            {/* Rolling Elements (BSF balls inside bearing race) */}
            <g className={getHighlightClass('ROLLING_ELEMENT')}>
              <circle cx="180" cy="225" r="4" />
              <circle cx="180" cy="255" r="4" />
              <circle cx="165" cy="240" r="4" />
              <circle cx="195" cy="240" r="4" />
              <circle cx="169" cy="229" r="3.5" />
              <circle cx="191" cy="251" r="3.5" />
            </g>

            {/* Sensor Tap Loci (ADXL355, CHT, EGT, Oil P) */}
            <g>
              {/* ADXL355 Accelerometer Tap (Main Crank Bearing Case) */}
              <circle cx="245" cy="215" r="6" className={getSensorClass('SENSOR_ADXL')} />
              {/* CHT Thermocouple */}
              <circle cx="100" cy="60" r="6" className="fill-orange-500 stroke-black stroke-[2px]" />
              {/* EGT Exhaust Probe */}
              <circle cx="260" cy="40" r="6" className="fill-red-500 stroke-black stroke-[2px]" />
              {/* Oil Pressure Transducer */}
              <circle cx="75" cy="250" r="6" className="fill-blue-500 stroke-black stroke-[2px]" />
            </g>
          </g>
        </svg>

        {/* View Badge */}
        <div className="absolute top-3 left-3 bg-white border-2 border-black px-2 py-1 font-mono text-[10px] font-bold flex items-center gap-1 shadow-[var(--shadow-neobrutalism-sm)]">
          <Eye size={12} />
          <span>SECTION: CYLINDER #1-4 AXIAL</span>
        </div>

        {/* Sensor Legend */}
        <div className="absolute top-3 right-3 bg-white border-2 border-black p-2 font-mono text-[10px] space-y-1 shadow-[var(--shadow-neobrutalism-sm)] hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand-blue)] border border-black inline-block"></span>
            <span>ADXL355 Vib</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-black inline-block"></span>
            <span>CHT ({telemetry.cht.current}°C)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-black inline-block"></span>
            <span>Oil ({telemetry.oilPressure.current} bar)</span>
          </div>
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
    </div>
  );
};
