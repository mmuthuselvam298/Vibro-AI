import React, { useEffect } from 'react';
import { useEngineStore, type ScenarioType } from '@/store/engineStore';
import { Play, Square, SlidersHorizontal, RotateCcw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScenarioMeta {
  type: ScenarioType;
  plainLabel: string;
  techLabel: string;
  shortcut: string;
  category: string;
}

const SCENARIO_DIRECTORY: ScenarioMeta[] = [
  { type: 'HEALTHY', plainLabel: 'Normal Operation', techLabel: 'Healthy Baseline', shortcut: '1', category: 'Baseline' },
  { type: 'EARLY_BEARING_WEAR', plainLabel: 'Bearing Starting to Wear', techLabel: 'Early BPFO Defect', shortcut: '2', category: 'Mechanical' },
  { type: 'SEVERE_BEARING_WEAR', plainLabel: 'Severe Bearing Damage', techLabel: 'Outer Race Flaking', shortcut: '3', category: 'Mechanical' },
  { type: 'ROLLING_ELEMENT_DEFECT', plainLabel: 'Bearing Ball Defect', techLabel: 'BSF Ball Spin Frequency', shortcut: '6', category: 'Mechanical' },
  { type: 'PISTON_SLAP', plainLabel: 'Piston Knocking in Cylinder', techLabel: 'Piston Slap (TDC/BDC)', shortcut: '4', category: 'Cylinder & Valves' },
  { type: 'VALVE_LASH', plainLabel: 'Loose Valve Clearance', techLabel: 'Valve Lash Gap (4X)', shortcut: '5', category: 'Cylinder & Valves' },
  { type: 'MISFIRE', plainLabel: 'Cylinder Misfiring', techLabel: 'Combustion Misfire', shortcut: '7', category: 'Combustion & Fuel' },
  { type: 'INJECTOR_ABNORMALITY', plainLabel: 'Clogged Fuel Injector', techLabel: 'Fuel Flow Restriction', shortcut: '8', category: 'Combustion & Fuel' },
  { type: 'COMBUSTION_INSTABILITY', plainLabel: 'Rough Combustion Swings', techLabel: 'Combustion Instability', shortcut: '=', category: 'Combustion & Fuel' },
  { type: 'LUBRICATION_ISSUE', plainLabel: 'Low Oil Pressure / Friction', techLabel: 'Lubrication Starvation', shortcut: '9', category: 'Thermal & Fluids' },
  { type: 'OVERHEATING', plainLabel: 'Engine Overheating (CHT High)', techLabel: 'Thermal Runaway', shortcut: '0', category: 'Thermal & Fluids' },
  { type: 'SENSOR_DRIFT', plainLabel: 'Sensor Glitch / False Alarm', techLabel: 'ADXL355 Sensor Drift', shortcut: '-', category: 'Thermal & Fluids' },
];

export const DemoControls: React.FC = () => {
  const {
    scenario,
    setScenario,
    resetToHealthy,
    isSimulating,
    toggleSimulation,
    dataMode,
    setDataMode,
    plainLanguageMode,
  } = useEngineStore();
  const [isOpen, setIsOpen] = React.useState(false);

  const quickPresets: ScenarioMeta[] = [
    SCENARIO_DIRECTORY[0], // Healthy
    SCENARIO_DIRECTORY[1], // Early Bearing
    SCENARIO_DIRECTORY[2], // Severe Bearing
    SCENARIO_DIRECTORY[11], // Sensor Drift
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      switch (e.key) {
        case '1': resetToHealthy(); break;
        case '2': setScenario('EARLY_BEARING_WEAR'); break;
        case '3': setScenario('SEVERE_BEARING_WEAR'); break;
        case '4': setScenario('PISTON_SLAP'); break;
        case '5': setScenario('VALVE_LASH'); break;
        case '6': setScenario('ROLLING_ELEMENT_DEFECT'); break;
        case '7': setScenario('MISFIRE'); break;
        case '8': setScenario('INJECTOR_ABNORMALITY'); break;
        case '9': setScenario('LUBRICATION_ISSUE'); break;
        case '0': setScenario('OVERHEATING'); break;
        case '-': setScenario('SENSOR_DRIFT'); break;
        case '=': setScenario('COMBUSTION_INSTABILITY'); break;
        case ' ':
          e.preventDefault();
          toggleSimulation();
          break;
        case 'd':
        case 'D':
          setIsOpen(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setScenario, resetToHealthy, toggleSimulation]);

  const currentMeta = SCENARIO_DIRECTORY.find(s => s.type === scenario) || SCENARIO_DIRECTORY[0];

  if (!isOpen) {
    return (
      <div className="flex items-center gap-2">
        {scenario !== 'HEALTHY' && (
          <button
            onClick={() => resetToHealthy()}
            className="neo-button bg-[#34C759] text-black border-2 border-black flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0px_0px_#000] hover:bg-green-400 transition-all"
            title="Instantly clear all simulated faults (Press '1')"
          >
            <RotateCcw size={13} className="stroke-[2.5]" />
            <span className="hidden sm:inline">RESET TO HEALTHY</span>
            <span className="sm:hidden">RESET</span>
            <span className="text-[10px] bg-white text-black px-1 border border-black">1</span>
          </button>
        )}

        <button
          onClick={() => setIsOpen(true)}
          className="neo-button bg-black text-white flex items-center gap-2 px-3 py-2 font-mono text-xs shadow-[var(--shadow-neobrutalism-sm)] hover:bg-neutral-800 tracking-wider border-2 border-black"
          title="Open Scenario Controller (Press 'D')"
        >
          <SlidersHorizontal size={14} />
          <span className="font-bold text-[11px] hidden sm:inline">DEMO SCENARIOS</span>
          <span className="bg-[var(--color-brand-yellow)] text-black text-[10px] font-bold px-1.5 py-0.5 border border-black ml-0.5 max-w-[130px] truncate">
            {plainLanguageMode ? currentMeta.plainLabel : currentMeta.techLabel}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="neo-card bg-white border-2 border-black p-4 w-full max-w-md flex flex-col gap-3 origin-bottom-right animate-in slide-in-from-bottom-3 shadow-[var(--shadow-neobrutalism)] z-50">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-black pb-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} />
          <div>
            <h3 className="font-extrabold text-xs uppercase tracking-wider">Demo Scenario Injector</h3>
            <p className="text-[10px] text-gray-500 font-mono">Test how the AI & physics engine react live</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-[10px] font-mono font-bold px-2 py-0.5 border border-black bg-gray-100 hover:bg-black hover:text-white transition-colors"
        >
          ✕ CLOSE
        </button>
      </div>

      {/* Prominent One-Click Reset to Healthy */}
      <button
        onClick={() => resetToHealthy()}
        className={cn(
          "w-full py-2 px-3 border-2 border-black font-mono text-xs font-black flex items-center justify-between shadow-[2px_2px_0px_0px_#000] transition-all",
          scenario === 'HEALTHY'
            ? "bg-green-100 text-green-900 border-green-700"
            : "bg-[#34C759] text-black hover:bg-green-400 -translate-y-0.5"
        )}
      >
        <span className="flex items-center gap-2">
          <CheckCircle2 size={15} className="stroke-[2.5]" />
          <span>ONE-CLICK RESET TO HEALTHY</span>
        </span>
        <span className="text-[10px] bg-white text-black px-1.5 py-0.5 border border-black font-bold">
          Key '1'
        </span>
      </button>

      {/* Quick 4 One-Click Presets */}
      <div>
        <span className="text-[10px] font-mono font-bold uppercase text-gray-500 block mb-1">
          Quick Demo Presets:
        </span>
        <div className="grid grid-cols-2 gap-1.5 font-mono">
          {quickPresets.map((p) => {
            const isSelected = scenario === p.type;
            return (
              <button
                key={p.type}
                onClick={() => setScenario(p.type)}
                className={cn(
                  "p-2 border-2 text-left transition-all flex flex-col justify-between text-xs",
                  isSelected
                    ? "border-black bg-black text-white font-bold shadow-[2px_2px_0px_0px_#000]"
                    : "border-black bg-gray-50 hover:bg-white text-black font-semibold"
                )}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="font-bold text-[11px] leading-tight line-clamp-1">
                    {p.plainLabel}
                  </span>
                  <span className={cn(
                    "text-[9px] px-1 border shrink-0",
                    isSelected ? "border-white bg-neutral-800 text-white" : "border-black bg-white"
                  )}>
                    {p.shortcut}
                  </span>
                </div>
                <span className={cn(
                  "text-[9px] truncate",
                  isSelected ? "text-yellow-300" : "text-gray-500"
                )}>
                  {p.techLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dropdown for All Scenarios with Dual Labels */}
      <div>
        <label className="text-[10px] font-mono font-bold uppercase text-gray-500 block mb-1">
          All 12 Scenarios (Select to inject):
        </label>
        <select
          value={scenario}
          onChange={(e) => setScenario(e.target.value as ScenarioType)}
          className="w-full border-2 border-black p-2 font-mono text-xs bg-[var(--color-brand-light)] font-bold cursor-pointer focus:outline-none focus:bg-white shadow-[2px_2px_0px_0px_#000]"
        >
          <optgroup label="Baseline">
            <option value="HEALTHY">1 • Healthy Engine (Normal baseline)</option>
          </optgroup>
          <optgroup label="Mechanical & Bearings">
            <option value="EARLY_BEARING_WEAR">2 • Early Bearing Wear (Micro-flaking / BPFO)</option>
            <option value="SEVERE_BEARING_WEAR">3 • Severe Bearing Damage (High impacts)</option>
            <option value="ROLLING_ELEMENT_DEFECT">6 • Bearing Ball Defect (Ball spin BSF)</option>
          </optgroup>
          <optgroup label="Cylinder & Valves">
            <option value="PISTON_SLAP">4 • Piston Slap (Side impact at TDC)</option>
            <option value="VALVE_LASH">5 • Loose Valve Gap (Excess clearance / 4X)</option>
          </optgroup>
          <optgroup label="Combustion & Fuel">
            <option value="MISFIRE">7 • Cylinder Misfire (Unburnt charge)</option>
            <option value="INJECTOR_ABNORMALITY">8 • Clogged Fuel Injector (Pressure loss)</option>
            <option value="COMBUSTION_INSTABILITY">= • Combustion Instability (Rough burns)</option>
          </optgroup>
          <optgroup label="Thermal, Fluids & Sensors">
            <option value="LUBRICATION_ISSUE">9 • Low Oil Pressure (Friction risk)</option>
            <option value="OVERHEATING">0 • Engine Overheating (High CHT & Oil Temp)</option>
            <option value="SENSOR_DRIFT">- • Sensor Drift Glitch (Isolated false alarm)</option>
          </optgroup>
        </select>
      </div>

      {/* Active Scenario Info Box */}
      <div className="p-2 border border-black bg-neutral-50 text-[11px] font-mono flex items-center justify-between">
        <div>
          <span className="text-gray-500 font-medium">Active: </span>
          <span className="font-bold text-black">{currentMeta.plainLabel}</span>
          <span className="text-gray-500 block text-[10px]">Technical: {currentMeta.techLabel} ({currentMeta.type})</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 border border-black bg-yellow-300 font-bold shrink-0">
          Key '{currentMeta.shortcut}'
        </span>
      </div>

      {/* Footer Controls: Play/Pause + Mode */}
      <div className="flex justify-between items-center pt-2 border-t border-gray-200 gap-2 font-mono text-xs">
        <button
          onClick={toggleSimulation}
          className="neo-button bg-white text-black px-2.5 py-1 text-xs flex items-center gap-1 font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000]"
        >
          {isSimulating ? <><Square size={11} className="fill-black" /> Pause (Space)</> : <><Play size={11} className="fill-black" /> Resume (Space)</>}
        </button>

        <div className="flex border-2 border-black bg-gray-100 p-0.5">
          <button
            onClick={() => setDataMode('SIMULATION')}
            className={cn(
              "px-2 py-0.5 text-[10px] font-bold transition-all",
              dataMode === 'SIMULATION' ? "bg-black text-white" : "text-black hover:bg-gray-200"
            )}
            title="Synthesized physics engine simulation"
          >
            SIM ENGINE
          </button>
          <button
            onClick={() => setDataMode('LIVE_HARDWARE_STREAM')}
            className={cn(
              "px-2 py-0.5 text-[10px] font-bold transition-all",
              dataMode === 'LIVE_HARDWARE_STREAM' ? "bg-[var(--color-brand-red)] text-white" : "text-black hover:bg-gray-200"
            )}
            title="External ADXL355/MAX31855 serial data stream"
          >
            HARDWARE LIVE
          </button>
        </div>
      </div>
    </div>
  );
};
