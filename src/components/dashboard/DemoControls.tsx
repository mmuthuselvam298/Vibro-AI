import React, { useEffect } from 'react';
import { useEngineStore, type ScenarioType } from '@/store/engineStore';
import { Play, Square, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DemoControls: React.FC = () => {
  const {
    scenario,
    setScenario,
    isSimulating,
    toggleSimulation,
    dataMode,
    setDataMode
  } = useEngineStore();
  const [isOpen, setIsOpen] = React.useState(false);

  const quickPresets: { type: ScenarioType; label: string; shortcut: string }[] = [
    { type: 'HEALTHY', label: 'Healthy Baseline', shortcut: '1' },
    { type: 'EARLY_BEARING_WEAR', label: 'Bearing Wear (BPFO)', shortcut: '2' },
    { type: 'PISTON_SLAP', label: 'Piston Slap', shortcut: '4' },
    { type: 'LUBRICATION_ISSUE', label: 'Low Oil Pressure', shortcut: '9' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      switch (e.key) {
        case '1': setScenario('HEALTHY'); break;
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
  }, [setScenario, toggleSimulation]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="neo-button bg-black text-white flex items-center gap-2 px-3 py-2 font-mono text-xs shadow-[var(--shadow-neobrutalism-sm)] hover:bg-neutral-800 tracking-wider border-2 border-black"
        title="Open Scenario Controller (Press 'D')"
      >
        <SlidersHorizontal size={14} />
        <span className="font-bold text-[11px]">DEMO PRESETS</span>
        <span className="bg-[var(--color-brand-yellow)] text-black text-[10px] font-bold px-1.5 py-0.5 border border-black ml-0.5 max-w-[120px] truncate">
          {scenario.replace(/_/g, ' ')}
        </span>
      </button>
    );
  }

  return (
    <div className="neo-card bg-white border-2 border-black p-4 w-full max-w-sm flex flex-col gap-3 origin-bottom-right animate-in slide-in-from-bottom-3 shadow-[var(--shadow-neobrutalism)] z-50">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-black pb-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} />
          <h3 className="font-extrabold text-xs uppercase tracking-wider">Scenario Controller</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black bg-gray-100 hover:bg-black hover:text-white transition-colors"
        >
          ✕ CLOSE
        </button>
      </div>

      {/* Quick 4 One-Click Presets */}
      <div>
        <span className="text-[10px] font-mono font-bold uppercase text-gray-500 block mb-1">
          Quick Presets:
        </span>
        <div className="grid grid-cols-2 gap-1.5 font-mono">
          {quickPresets.map((p) => {
            const isSelected = scenario === p.type;
            return (
              <button
                key={p.type}
                onClick={() => setScenario(p.type)}
                className={cn(
                  "p-1.5 border text-left transition-all flex items-center justify-between text-[11px]",
                  isSelected
                    ? "border-black bg-black text-white font-bold"
                    : "border-black bg-gray-50 hover:bg-white text-black font-semibold"
                )}
              >
                <span className="truncate mr-1">{p.label}</span>
                <span className={cn(
                  "text-[9px] px-1 border",
                  isSelected ? "border-white bg-neutral-800 text-white" : "border-black bg-white"
                )}>
                  {p.shortcut}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dropdown for All Scenarios */}
      <div>
        <label className="text-[10px] font-mono font-bold uppercase text-gray-500 block mb-1">
          All 12 Fault Scenarios:
        </label>
        <select
          value={scenario}
          onChange={(e) => setScenario(e.target.value as ScenarioType)}
          className="w-full border-2 border-black p-1.5 font-mono text-xs bg-[var(--color-brand-light)] font-bold cursor-pointer focus:outline-none focus:bg-white"
        >
          <optgroup label="Baseline & Mechanical">
            <option value="HEALTHY">1 • Healthy Baseline</option>
            <option value="EARLY_BEARING_WEAR">2 • Early Bearing Wear (BPFO)</option>
            <option value="SEVERE_BEARING_WEAR">3 • Severe Bearing Flaking</option>
            <option value="ROLLING_ELEMENT_DEFECT">6 • Rolling Element Defect (BSF)</option>
          </optgroup>
          <optgroup label="Cylinder & Valves">
            <option value="PISTON_SLAP">4 • Piston Slap (TDC/BDC)</option>
            <option value="VALVE_LASH">5 • Valve Lash Gap (4X)</option>
          </optgroup>
          <optgroup label="Combustion & Fuel">
            <option value="MISFIRE">7 • Cylinder Misfire</option>
            <option value="INJECTOR_ABNORMALITY">8 • Injector Clogging / Drift</option>
            <option value="COMBUSTION_INSTABILITY">= • Combustion Instability</option>
          </optgroup>
          <optgroup label="Thermal & Fluids">
            <option value="LUBRICATION_ISSUE">9 • Low Oil Pressure / Lubrication</option>
            <option value="OVERHEATING">0 • Thermal Runaway / Overheating</option>
            <option value="SENSOR_DRIFT">- • ADXL355 Sensor Drift</option>
          </optgroup>
        </select>
      </div>

      {/* Footer Controls: Play/Pause + Mode */}
      <div className="flex justify-between items-center pt-2 border-t border-gray-200 gap-2 font-mono text-xs">
        <button
          onClick={toggleSimulation}
          className="neo-button bg-white text-black px-2.5 py-1 text-xs flex items-center gap-1 font-bold"
        >
          {isSimulating ? <><Square size={11} className="fill-black" /> Pause</> : <><Play size={11} className="fill-black" /> Resume</>}
        </button>

        <div className="flex border border-black bg-gray-100 p-0.5">
          <button
            onClick={() => setDataMode('SIMULATION')}
            className={cn(
              "px-2 py-0.5 text-[10px] font-bold transition-all",
              dataMode === 'SIMULATION' ? "bg-black text-white" : "text-black hover:bg-gray-200"
            )}
          >
            SIM
          </button>
          <button
            onClick={() => setDataMode('LIVE_HARDWARE_STREAM')}
            className={cn(
              "px-2 py-0.5 text-[10px] font-bold transition-all",
              dataMode === 'LIVE_HARDWARE_STREAM' ? "bg-[var(--color-brand-red)] text-white" : "text-black hover:bg-gray-200"
            )}
          >
            LIVE
          </button>
        </div>
      </div>
    </div>
  );
};
