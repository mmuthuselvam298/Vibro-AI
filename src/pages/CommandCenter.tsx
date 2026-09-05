import React, { useState } from 'react';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import { HeroMetrics } from '@/components/dashboard/HeroMetrics';
import { SensorFusionCard } from '@/components/dashboard/SensorFusionCard';
import { TelemetryGrid } from '@/components/dashboard/TelemetryGrid';
import { LiveVibration } from '@/components/dashboard/LiveVibration';
import { DigitalTwin } from '@/components/dashboard/DigitalTwin';
import { DiagnosisPanel } from '@/components/dashboard/DiagnosisPanel';
import { SignalAnalysis } from '@/components/dashboard/SignalAnalysis';
import { DegradationChart } from '@/components/dashboard/DegradationChart';
import { PhysicsResidualPanel } from '@/components/dashboard/PhysicsResidualPanel';
import { MaintenanceAdvisoryPanel } from '@/components/dashboard/MaintenanceAdvisoryPanel';
import { MissionReplayWidget } from '@/components/dashboard/MissionReplayWidget';
import { LayoutGrid, Cpu, Activity, Scale, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'OVERVIEW' | 'TELEMETRY' | 'DIAGNOSTICS' | 'DSP_RUL' | 'ALL';

export const CommandCenter: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('OVERVIEW');

  const tabs: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'OVERVIEW', label: 'Overview Deck', icon: <LayoutGrid size={15} /> },
    { id: 'TELEMETRY', label: '9-Ch Telemetry', icon: <Activity size={15} /> },
    { id: 'DIAGNOSTICS', label: 'Physics & AI Diagnosis', icon: <Scale size={15} /> },
    { id: 'DSP_RUL', label: 'DSP & RUL Prognostics', icon: <Cpu size={15} /> },
    { id: 'ALL', label: 'Full Deck (All)', icon: <Compass size={15} /> },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-[1600px] mx-auto animate-in fade-in duration-300 pb-16">
      {/* Top Banner & Hero KPI Metrics */}
      <AlertBanner />
      <HeroMetrics />

      {/* Module Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-neutral-100 border-2 border-black">
          {tabs.map((tab) => {
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={cn(
                  "px-3.5 py-1.5 font-mono text-xs font-bold flex items-center gap-2 transition-all shrink-0",
                  isActive
                    ? "bg-black text-white shadow-[var(--shadow-neobrutalism-sm)] -translate-y-0.5"
                    : "bg-white text-neutral-800 hover:bg-neutral-200 border border-transparent"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] font-mono text-gray-500 font-semibold hidden md:block">
          UAV ENGINE HEALTH MONITORING & PROGNOSTICS SYSTEM (SIH26054)
        </div>
      </div>

      {/* View 1: Core Overview Deck (Matches First Version Primary Viewport) */}
      {viewMode === 'OVERVIEW' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Primary Observability Grid: Vibration Waveform & Spatial Digital Twin */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LiveVibration />
            <DigitalTwin />
          </div>

          {/* Sensor Fusion Synthesis Card */}
          <SensorFusionCard />

          {/* Actionable Engineering Advisory & Mission Scrubber */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MaintenanceAdvisoryPanel />
            <MissionReplayWidget />
          </div>
        </div>
      )}

      {/* View 2: Multi-Sensor Telemetry Grid */}
      {viewMode === 'TELEMETRY' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          <SensorFusionCard />
          <TelemetryGrid />
        </div>
      )}

      {/* View 3: Physics Residuals & AI Diagnosis */}
      {viewMode === 'DIAGNOSTICS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in duration-200">
          <DiagnosisPanel />
          <PhysicsResidualPanel />
          <div className="lg:col-span-2">
            <MaintenanceAdvisoryPanel />
          </div>
        </div>
      )}

      {/* View 4: Signal DSP & RUL Prognostics */}
      {viewMode === 'DSP_RUL' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in duration-200">
          <LiveVibration />
          <SignalAnalysis />
          <div className="lg:col-span-2">
            <DegradationChart />
          </div>
        </div>
      )}

      {/* View 5: Full Deck (All Modules Organized) */}
      {viewMode === 'ALL' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          <SensorFusionCard />
          <TelemetryGrid />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <LiveVibration />
            <DigitalTwin />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <DiagnosisPanel />
            <SignalAnalysis />
            <DegradationChart />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PhysicsResidualPanel />
            <MaintenanceAdvisoryPanel />
          </div>

          <MissionReplayWidget />
        </div>
      )}
    </div>
  );
};
