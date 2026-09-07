import React, { useState } from 'react';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import { HeroMetrics } from '@/components/dashboard/HeroMetrics';
import { ExpectedVsCurrentBars } from '@/components/dashboard/ExpectedVsCurrentBars';
import { MissionReliabilityPanel } from '@/components/dashboard/MissionReliabilityPanel';
import { HealthBreakdownCard } from '@/components/dashboard/HealthBreakdownCard';
import { WhatIfSimulatorModal } from '@/components/dashboard/WhatIfSimulatorModal';
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
import { LayoutGrid, Cpu, Activity, Scale, Compass, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'OVERVIEW' | 'TELEMETRY' | 'DIAGNOSTICS' | 'DSP_RUL' | 'ALL';

export const CommandCenter: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('OVERVIEW');
  const [isWhatIfOpen, setIsWhatIfOpen] = useState<boolean>(false);

  const tabs: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'OVERVIEW', label: 'Overview Deck', icon: <LayoutGrid size={15} /> },
    { id: 'TELEMETRY', label: '9-Ch Telemetry', icon: <Activity size={15} /> },
    { id: 'DIAGNOSTICS', label: 'Physics & AI Diagnosis', icon: <Scale size={15} /> },
    { id: 'DSP_RUL', label: 'DSP & RUL Prognostics', icon: <Cpu size={15} /> },
    { id: 'ALL', label: 'Full Deck (All)', icon: <Compass size={15} /> },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-[1600px] mx-auto animate-in fade-in duration-300 pb-16">
      {/* 1. Top Banner & Hero KPI Metrics */}
      <AlertBanner />
      <HeroMetrics />

      {/* 2. PROMINENT CORE SECTION: EXPECTED HEALTHY STATE VS CURRENT LIVE ENGINE */}
      <ExpectedVsCurrentBars />

      {/* 3. Module Navigation Tabs & Quick Actions */}
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWhatIfOpen(true)}
            className="px-3 py-1.5 font-mono text-xs font-bold bg-white text-black border-2 border-black hover:bg-black hover:text-white transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000]"
          >
            <Sparkles size={14} className="text-yellow-500" />
            <span>WHAT-IF DIGITAL TWIN</span>
          </button>
          <div className="text-[11px] font-mono text-gray-500 font-semibold hidden lg:block">
            SIH26054 AEROSPACE HEALTH & RELIABILITY TWIN
          </div>
        </div>
      </div>

      {/* View 1: Core Overview Deck */}
      {viewMode === 'OVERVIEW' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Observability Row: Vibration Waveform & Spatial Digital Twin */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LiveVibration />
            <DigitalTwin />
          </div>

          {/* Mission Reliability & Operator Decision Support */}
          <MissionReliabilityPanel onOpenWhatIf={() => setIsWhatIfOpen(true)} />

          {/* Transparent Health Score Breakdown & Sensor Fusion Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HealthBreakdownCard />
            <SensorFusionCard />
          </div>

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
            <HealthBreakdownCard />
          </div>
          <div className="lg:col-span-2">
            <MaintenanceAdvisoryPanel />
          </div>
        </div>
      )}

      {/* View 4: Signal DSP & RUL Prognostics */}
      {viewMode === 'DSP_RUL' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <LiveVibration />
            <SignalAnalysis />
          </div>
          <DegradationChart />
          <MissionReliabilityPanel onOpenWhatIf={() => setIsWhatIfOpen(true)} />
        </div>
      )}

      {/* View 5: Full Deck (All Modules Organized) */}
      {viewMode === 'ALL' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <LiveVibration />
            <DigitalTwin />
          </div>

          <MissionReliabilityPanel onOpenWhatIf={() => setIsWhatIfOpen(true)} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <HealthBreakdownCard />
            <SensorFusionCard />
          </div>

          <TelemetryGrid />

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

      {/* What-If Simulation Modal */}
      <WhatIfSimulatorModal
        isOpen={isWhatIfOpen}
        onClose={() => setIsWhatIfOpen(false)}
      />
    </div>
  );
};
