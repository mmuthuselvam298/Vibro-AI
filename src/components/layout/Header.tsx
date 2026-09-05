import React from 'react';
import { Menu, Zap, Clock, Radio, Database, Plane } from 'lucide-react';
import { useEngineStore } from '@/store/engineStore';
import { cn } from '@/lib/utils';

interface HeaderProps {
  toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const {
    alertStatus,
    operatingCycle,
    inferenceLatency,
    dataMode,
    missionProfile,
    setDataMode
  } = useEngineStore();

  const getAlertColor = () => {
    switch (alertStatus) {
      case 'CRITICAL': return 'bg-[var(--color-brand-red)] text-white';
      case 'WARNING': return 'bg-[var(--color-brand-yellow)] text-black';
      default: return 'bg-[var(--color-brand-green)] text-black';
    }
  };

  return (
    <header className="h-20 border-b-4 border-black bg-white flex items-center justify-between px-4 md:px-6 shadow-[0px_4px_0px_0px_#000000] z-30 relative shrink-0">
      <div className="flex items-center gap-4">
        <button
          className="md:hidden p-2 border-2 border-black hover:bg-gray-100 shadow-[var(--shadow-neobrutalism-sm)]"
          onClick={toggleSidebar}
        >
          <Menu size={24} />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold uppercase tracking-tight m-0 truncate">
              Multi-Parameter Health & Prognostics
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black bg-[var(--color-brand-light)]">
              FUSION AI
            </span>
          </div>
          <div className="text-xs font-mono text-gray-600 flex items-center gap-2 mt-0.5">
            <span className="font-bold text-black">UAV: DRDO-07</span>
            <span>|</span>
            <span className="hidden md:inline">ENGINE: ROTAX 912 / PISTON-4X</span>
            <span>|</span>
            <span className="flex items-center gap-1 font-bold text-blue-900">
              <Plane size={12} /> {missionProfile.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {/* Data Mode Switcher */}
        <div className="hidden lg:flex items-center border-2 border-black bg-gray-100 p-0.5 font-mono text-xs font-bold">
          <button
            onClick={() => setDataMode('SIMULATION')}
            className={cn(
              "px-2 py-1 flex items-center gap-1 transition-all",
              dataMode === 'SIMULATION' ? "bg-black text-white shadow-[1px_1px_0px_0px_#000]" : "text-gray-700 hover:text-black"
            )}
          >
            <Database size={12} />
            <span>SIM</span>
          </button>
          <button
            onClick={() => setDataMode('LIVE_HARDWARE_STREAM')}
            className={cn(
              "px-2 py-1 flex items-center gap-1 transition-all",
              dataMode === 'LIVE_HARDWARE_STREAM' ? "bg-[var(--color-brand-red)] text-white shadow-[1px_1px_0px_0px_#000]" : "text-gray-700 hover:text-black"
            )}
          >
            <Radio size={12} />
            <span>STM32 / CAN</span>
          </button>
        </div>

        {/* Telemetry Cycle & Latency */}
        <div className="hidden sm:flex flex-col items-end font-mono text-xs">
          <div className="flex items-center gap-1">
            <Clock size={13} />
            <span>Cycle: #{operatingCycle.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 text-[var(--color-brand-blue)] font-bold">
            <Zap size={13} />
            <span>Latency: {inferenceLatency}ms</span>
          </div>
        </div>

        {/* Alert Badge */}
        <div className={cn("neo-badge border-4 px-3 py-1.5 text-xs font-mono font-bold shadow-[var(--shadow-neobrutalism-sm)]", getAlertColor())}>
          {alertStatus}
        </div>
      </div>
    </header>
  );
};
