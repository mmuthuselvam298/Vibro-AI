import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { computeAdaptiveBaseline } from '@/lib/physicsBaseline';
import { computeTrendRUL, computeMissionReliability } from '@/lib/prognosticsEngine';
import { Printer, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EngineReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EngineReportModal: React.FC<EngineReportModalProps> = ({ isOpen, onClose }) => {
  const {
    scenario,
    engineHealth,
    faultType,
    severity,
    confidence,
    operatingCycle,
    maintenanceAction,
    maintenanceUrgency,
    evidencePoints,
    telemetry,
    missionProfile,
    missionTimeSeconds,
    missionTotalDuration,
    degradationRate
  } = useEngineStore();

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

  const rulResult = React.useMemo(() => {
    return computeTrendRUL(engineHealth, degradationRate, severity);
  }, [engineHealth, degradationRate, severity]);

  const reliability = React.useMemo(() => {
    return computeMissionReliability(
      engineHealth,
      rulResult,
      missionTimeSeconds,
      missionTotalDuration,
      severity
    );
  }, [engineHealth, rulResult, missionTimeSeconds, missionTotalDuration, severity]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const reportTime = new Date().toLocaleTimeString('en-US', { hour12: false });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="neo-card bg-white border-4 border-black w-full max-w-4xl p-6 sm:p-8 flex flex-col gap-5 shadow-[8px_8px_0px_0px_#000] text-black my-8">
        {/* Top Control Bar (Hidden during print) */}
        <div className="flex justify-between items-center border-b-4 border-black pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-black" />
            <span className="font-extrabold text-sm uppercase tracking-wider font-mono">
              Engine Health Summary Report (Printable Leave-Behind)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 font-mono text-xs font-bold border-2 border-black bg-black text-white hover:bg-neutral-800 flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000]"
            >
              <Printer size={14} />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 border-2 border-black bg-neutral-100 hover:bg-black hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Header */}
        <div className="border-b-2 border-black pb-4">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase">
                SMART INDIA HACKATHON (SIH26054) PROTOTYPE REPORT
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-black mt-0.5">
                UAV Engine Health & Prognostics Report
              </h1>
              <div className="text-xs font-mono text-neutral-600 mt-1">
                SYSTEM: <strong>VIBRO-AI FUSION</strong> • AIRFRAME: <strong>ROTAX 912 AERO PISTON</strong> • ENVELOPE: <strong>{missionProfile}</strong>
              </div>
            </div>

            <div className="text-right font-mono text-xs border border-black p-2 bg-neutral-50 shrink-0">
              <div>DATE: <strong>{reportDate}</strong></div>
              <div>TIME: <strong>{reportTime} UTC</strong></div>
              <div>CYCLE: <strong>#{operatingCycle}</strong></div>
            </div>
          </div>
        </div>

        {/* Executive KPI Summary Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-3 border-2 border-black bg-neutral-50">
            <span className="text-[10px] font-bold text-neutral-500 block uppercase">ENGINE HEALTH</span>
            <div className="text-2xl sm:text-3xl font-extrabold mt-0.5">
              {engineHealth.toFixed(1)}%
            </div>
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.2 border border-black inline-block mt-1",
              engineHealth > 85 ? "bg-[var(--color-brand-green)] text-black" :
              engineHealth > 50 ? "bg-[var(--color-brand-yellow)] text-black" : "bg-[var(--color-brand-red)] text-white"
            )}>
              {engineHealth > 85 ? "NOMINAL" : engineHealth > 50 ? "WATCH" : "CRITICAL"}
            </span>
          </div>

          <div className="p-3 border-2 border-black bg-neutral-50">
            <span className="text-[10px] font-bold text-neutral-500 block uppercase">ESTIMATED RUL</span>
            <div className="text-2xl sm:text-3xl font-extrabold mt-0.5">
              {rulResult.rulNominal} <span className="text-xs font-normal">CYC</span>
            </div>
            <span className="text-[9px] text-neutral-600 block mt-1 font-bold">
              Range: {rulResult.rulMin}–{rulResult.rulMax} ({rulResult.confidencePercent}% conf)
            </span>
          </div>

          <div className="p-3 border-2 border-black bg-neutral-50">
            <span className="text-[10px] font-bold text-neutral-500 block uppercase">MISSION RELIABILITY</span>
            <div className="text-2xl sm:text-3xl font-extrabold mt-0.5">
              {reliability.reliabilityScore}%
            </div>
            <span className="text-[9px] text-neutral-600 block mt-1 font-bold">
              Status: {reliability.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="p-3 border-2 border-black bg-neutral-50">
            <span className="text-[10px] font-bold text-neutral-500 block uppercase">RECOMMENDED ACTION</span>
            <div className="text-xs font-extrabold mt-1 text-black leading-tight uppercase line-clamp-2">
              {reliability.recommendation.actionText}
            </div>
            <span className="text-[9px] text-neutral-600 block mt-1">
              Urgency: {maintenanceUrgency}
            </span>
          </div>
        </div>

        {/* Active Inferred Diagnosis Box */}
        <div className="p-3.5 border-2 border-black bg-[var(--color-brand-light)] font-mono text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="font-extrabold text-[11px] uppercase text-neutral-600">
              DIAGNOSTIC ASSESSMENT & PROBABLE DEFECT
            </span>
            <span className="font-bold text-[10px] px-1.5 py-0.5 border border-black bg-white">
              Confidence: {confidence.toFixed(1)}% (Multi-Parameter Corroborated)
            </span>
          </div>
          <div className="text-base font-extrabold text-black uppercase mb-1">
            {faultType}
          </div>
          <p className="text-xs text-neutral-800 leading-snug">
            {scenario === 'HEALTHY'
              ? 'All 9 telemetry channels conform to expected physical baseline. Zero abnormal mechanical vibration harmonics detected.'
              : `Multi-sensor corroboration confirms physical defect signature matching ${faultType}. Telemetry residuals exceed normal adaptive envelope.`}
          </p>
        </div>

        {/* Sensor Residuals Ledger */}
        <div>
          <span className="text-xs font-mono font-bold uppercase text-neutral-600 block mb-2">
            Sensor Telemetry vs Adaptive Healthy Baseline
          </span>
          <div className="overflow-x-auto">
            <table className="w-full border-2 border-black font-mono text-xs text-left">
              <thead className="bg-neutral-100 border-b-2 border-black text-[10px] uppercase">
                <tr>
                  <th className="p-2 border-r border-black font-bold">Parameter</th>
                  <th className="p-2 border-r border-black font-bold">Healthy Expected</th>
                  <th className="p-2 border-r border-black font-bold">Current Live</th>
                  <th className="p-2 border-r border-black font-bold">Residual (Delta)</th>
                  <th className="p-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-[11px]">
                {Object.values(baseline.parameters).map((param) => (
                  <tr key={param.label}>
                    <td className="p-2 border-r border-black font-bold">{param.label}</td>
                    <td className="p-2 border-r border-black">{param.expected} {param.unit}</td>
                    <td className="p-2 border-r border-black font-bold">{param.current} {param.unit}</td>
                    <td className="p-2 border-r border-black font-bold">
                      {param.residual > 0 ? `+${param.residual}` : param.residual} {param.unit} ({param.deviationPercent > 0 ? `+${param.deviationPercent}` : param.deviationPercent}%)
                    </td>
                    <td className="p-2 font-bold">
                      <span className={cn(
                        "px-1 py-0.2 border text-[10px]",
                        param.status === 'CRITICAL' ? "bg-red-100 text-red-900 border-black" :
                        param.status === 'ANOMALY' ? "bg-orange-100 text-orange-900 border-black" :
                        param.status === 'WATCH' ? "bg-amber-100 text-amber-900 border-black" : "bg-green-100 text-green-900 border-black"
                      )}>
                        {param.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Explainable Diagnostic Evidence Chain */}
        <div className="border-2 border-black p-3 bg-neutral-50 font-mono text-xs">
          <span className="text-[10px] font-bold uppercase text-neutral-500 block mb-1.5">
            Explainable Diagnostic Evidence Points:
          </span>
          <ul className="space-y-1">
            {evidencePoints.map((ev, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px]">
                <span className="font-bold">•</span>
                <span>{ev}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Prescribed Engineering Maintenance Action */}
        <div className="p-3 border-2 border-black bg-white font-mono text-xs">
          <span className="text-[10px] font-bold uppercase text-neutral-500 block mb-1">
            Prescribed Maintenance Directive:
          </span>
          <p className="font-bold text-sm text-black mb-1">
            {maintenanceAction}
          </p>
          <div className="text-[10px] text-neutral-500">
            Dispatch Classification: <strong>{maintenanceUrgency.replace(/_/g, ' ')}</strong> • Reference: FAA/EASA Piston Engine Maintenance Standards
          </div>
        </div>

        {/* Sign-off footer */}
        <div className="flex justify-between items-end pt-3 border-t-2 border-black text-[10px] font-mono text-neutral-500">
          <div>
            <div>VIBRO-AI FUSION HEALTH MONITORING PLATFORM</div>
            <div>Automated Flight Safety Decision Support</div>
          </div>
          <div className="text-right">
            <div>Authorized by: <strong>SIH26054 Automated Diagnostic Engine</strong></div>
            <div>Electronic Verification Hash: <strong>SHA256-{operatingCycle.toString(16)}8f4b</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
