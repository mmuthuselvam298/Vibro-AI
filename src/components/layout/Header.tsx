import React from 'react';
import { Menu, Zap, Clock, Radio, Database, Plane, Sparkles, FileText, Languages } from 'lucide-react';
import { useEngineStore } from '@/store/engineStore';
import { cn } from '@/lib/utils';

interface HeaderProps {
  toggleSidebar: () => void;
  onOpenTour?: () => void;
  onOpenReport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar, onOpenTour, onOpenReport }) => {
  const {
    alertStatus,
    operatingCycle,
    inferenceLatency,
    dataMode,
    missionProfile,
    setDataMode,
    plainLanguageMode,
    togglePlainLanguageMode,
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
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-2 border-2 border-black hover:bg-gray-100 shadow-[var(--shadow-neobrutalism-sm)]"
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <Menu size={22} />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg md:text-xl font-extrabold uppercase tracking-tight m-0 truncate">
              Vibro-AI <span className="text-neutral-400 font-normal">|</span> Engine Health & Failure Prevention
            </h1>
            <span className="hidden lg:inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black bg-[var(--color-brand-light)]">
              SIH26054
            </span>
          </div>
          <div className="text-[11px] font-mono text-gray-600 flex items-center gap-2 mt-0.5">
            <span className="font-bold text-black">UAV TESTBENCH</span>
            <span>|</span>
            <span className="hidden md:inline">ROTAX 912 PISTON</span>
            <span>|</span>
            <span className="flex items-center gap-1 font-bold text-blue-900">
              <Plane size={12} /> {missionProfile.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Simple vs Technical Mode Switch */}
        <button
          onClick={togglePlainLanguageMode}
          className={cn(
            "px-2.5 py-1 text-xs font-mono font-bold border-2 border-black flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_#000]",
            plainLanguageMode
              ? "bg-[var(--color-brand-yellow)] text-black"
              : "bg-neutral-800 text-white"
          )}
          title="Switch between Plain-English (Judge-Friendly) and Technical Engineering view"
        >
          <Languages size={13} />
          <span className="hidden sm:inline">Language:</span>
          <strong>{plainLanguageMode ? 'Simple' : 'Technical'}</strong>
        </button>

        {/* 60-Sec Tour Button */}
        {onOpenTour && (
          <button
            onClick={onOpenTour}
            className="px-2.5 py-1 text-xs font-mono font-bold border-2 border-black bg-black text-white hover:bg-neutral-800 flex items-center gap-1 shadow-[2px_2px_0px_0px_#000] shrink-0"
            title="Open 60-Second Guided Tour"
          >
            <Sparkles size={13} className="text-yellow-400" />
            <span className="hidden md:inline">60-Sec Tour</span>
          </button>
        )}

        {/* Export / Print Report Button */}
        {onOpenReport && (
          <button
            onClick={onOpenReport}
            className="px-2.5 py-1 text-xs font-mono font-bold border-2 border-black bg-white text-black hover:bg-neutral-100 flex items-center gap-1 shadow-[2px_2px_0px_0px_#000] shrink-0"
            title="Generate and print engine health report"
          >
            <FileText size={13} />
            <span className="hidden md:inline">Report</span>
          </button>
        )}

        {/* Data Mode Switcher */}
        <div className="hidden xl:flex items-center border-2 border-black bg-gray-100 p-0.5 font-mono text-xs font-bold">
          <button
            onClick={() => setDataMode('SIMULATION')}
            className={cn(
              "px-2 py-1 flex items-center gap-1 transition-all",
              dataMode === 'SIMULATION' ? "bg-black text-white shadow-[1px_1px_0px_0px_#000]" : "text-gray-700 hover:text-black"
            )}
          >
            <Database size={11} />
            <span>SIM</span>
          </button>
          <button
            onClick={() => setDataMode('LIVE_HARDWARE_STREAM')}
            className={cn(
              "px-2 py-1 flex items-center gap-1 transition-all",
              dataMode === 'LIVE_HARDWARE_STREAM' ? "bg-[var(--color-brand-red)] text-white shadow-[1px_1px_0px_0px_#000]" : "text-gray-700 hover:text-black"
            )}
          >
            <Radio size={11} />
            <span>CAN BUS</span>
          </button>
        </div>

        {/* Telemetry Cycle & Latency */}
        <div className="hidden sm:flex flex-col items-end font-mono text-[11px] leading-tight">
          <div className="flex items-center gap-1 text-neutral-600">
            <Clock size={11} />
            <span>Cycle #{operatingCycle.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 text-[var(--color-brand-blue)] font-bold">
            <Zap size={11} />
            <span>Latency: {inferenceLatency}ms</span>
          </div>
        </div>

        {/* Alert Badge */}
        <div className={cn("neo-badge border-4 px-2.5 py-1 text-xs font-mono font-bold shadow-[var(--shadow-neobrutalism-sm)]", getAlertColor())}>
          {alertStatus}
        </div>
      </div>
    </header>
  );
};
