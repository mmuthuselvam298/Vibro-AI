import React from 'react';
import { DegradationChart } from '@/components/dashboard/DegradationChart';
import { MissionReliabilityPanel } from '@/components/dashboard/MissionReliabilityPanel';
import { MissionReplayWidget } from '@/components/dashboard/MissionReplayWidget';
import { useEngineStore } from '@/store/engineStore';
import { GuideLink } from '@/components/dashboard/GuideLink';
import { JargonTooltip } from '@/components/dashboard/JargonTooltip';
import { ShieldAlert, Compass } from 'lucide-react';

export const DegradationPage: React.FC = () => {
  const { engineHealth, rul, degradationRate, missionProfile, plainLanguageMode } = useEngineStore();

  const profileProjections = [
    { profile: 'Endurance Cruise (10k ft)', rate: '0.12% / 100c', stress: 'Baseline Nominal', expectedRul: '185 Cycles (~83 Flight Hrs)' },
    { profile: 'High-Altitude Patrol (18k ft)', rate: '0.45% / 100c', stress: 'Moderate (Low Air Density)', expectedRul: '140 Cycles (~63 Flight Hrs)' },
    { profile: 'Hot-Weather Loiter (45°C Amb)', rate: '0.92% / 100c', stress: 'High Thermal Stress', expectedRul: '95 Cycles (~42 Flight Hrs)' },
    { profile: 'Rapid-Throttle Combat/Evasion', rate: '1.85% / 100c', stress: 'Extreme Mechanical Cycling', expectedRul: '50 Cycles (~22 Flight Hrs)' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto animate-in fade-in duration-300 pb-12">
      <div className="flex flex-wrap justify-between items-center border-b-4 border-black pb-2 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold uppercase tracking-tight">
              {plainLanguageMode ? 'Health Over Time' : 'Degradation & RUL Modeling'}
            </h2>
            <JargonTooltip
              term="Degradation & RUL Modeling"
              explanation="Tracks physical engine wear accumulation over flight cycles and projects the exact curve forward to predict how many hours remain before critical maintenance is required."
              analogy="Like monitoring brake pad thickness during each oil change and forecasting exactly how many miles are left before the metal backing touches the rotor."
              technicalDetails="Combines Paris' law mechanical fatigue with Arrhenius thermal acceleration equations to estimate Remaining Useful Life (RUL)."
            />
          </div>
          <p className="text-xs font-mono text-gray-600 mt-1">
            {plainLanguageMode
              ? 'Predicts how fast the engine is wearing out and how much flight time remains before maintenance is needed.'
              : 'Dynamic Remaining Useful Life (RUL) estimation with Weibull hazard rate decay and mission profile impact simulation.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="neo-badge bg-[var(--color-brand-blue)] text-white">
            TARGET 90% CONFIDENCE INTERVAL
          </span>
          <GuideLink sectionId="10-rul" label="RUL Formulation" />
        </div>
      </div>

      {/* Degradation Chart & Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DegradationChart />
        </div>

        {/* Prognostic Summary Metrics */}
        <div className="neo-card bg-[var(--color-brand-blue)] text-white flex flex-col justify-between p-6">
          <div className="flex justify-between items-start border-b-2 border-white/30 pb-3 mb-4">
            <div>
              <span className="font-bold text-lg uppercase block">
                {plainLanguageMode ? 'Time Left Summary' : 'Prognostic State'}
              </span>
              <span className="text-[10px] font-mono text-gray-300">
                {plainLanguageMode ? 'Physical Fatigue & Thermal Curve' : 'WEIBULL / EXPONENTIAL'}
              </span>
            </div>
            <ShieldAlert size={24} className="text-[var(--color-brand-yellow)]" />
          </div>

          <div className="space-y-4 font-mono">
            <div className="p-3 bg-white/10 border-2 border-white/40">
              <span className="text-[10px] text-gray-300 block uppercase">Current Engine Health</span>
              <div className="text-4xl font-bold tracking-tight text-[var(--color-brand-yellow)]">
                {engineHealth.toFixed(1)}%
              </div>
            </div>

            <div className="p-3 bg-white/10 border-2 border-white/40">
              <span className="text-[10px] text-gray-300 block uppercase">
                {plainLanguageMode ? 'Engine Wear Rate' : 'Current Degradation Rate'}
              </span>
              <div className="text-2xl font-bold tracking-tight">
                {degradationRate.toFixed(2)}% <span className="text-xs text-gray-300 font-normal">/ 100 cycles</span>
              </div>
            </div>

            <div className="p-3 bg-white/10 border-2 border-white/40">
              <span className="text-[10px] text-gray-300 block uppercase">
                {plainLanguageMode ? 'Safe Flight Time Remaining' : 'Projected RUL Horizon'}
              </span>
              <div className="text-3xl font-bold tracking-tight text-white">
                {rul} <span className="text-base font-normal text-gray-300">Cycles (~{(rul * 0.45).toFixed(0)} hrs)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-white/20 text-[10px] text-gray-300 font-mono">
            * Critical fail limit set at 40% functional structural integrity.
          </div>
        </div>
      </div>

      {/* Mission Reliability & Operational Safety Horizon */}
      <MissionReliabilityPanel />

      {/* Mission Simulator & Replay Scrubber */}
      <MissionReplayWidget />

      {/* Multi-Mission Profile Impact Table */}
      <div className="neo-card bg-white">
        <div className="flex justify-between items-center mb-3 border-b-4 border-black pb-2">
          <h3 className="font-bold text-xl uppercase flex items-center gap-2">
            <Compass size={22} /> Mission Profile RUL Sensitivity Analysis
          </h3>
          <span className="text-xs font-mono font-bold px-2 py-0.5 border border-black bg-gray-100">
            CURRENT: {missionProfile}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-2 border-black font-mono text-xs text-left">
            <thead className="bg-gray-100 border-b-2 border-black">
              <tr>
                <th className="p-2.5 border-r border-black font-bold">MISSION PROFILE</th>
                <th className="p-2.5 border-r border-black font-bold">DEGRADATION RATE</th>
                <th className="p-2.5 border-r border-black font-bold">ENVIRONMENTAL STRESS</th>
                <th className="p-2.5 font-bold">PROJECTED NOMINAL RUL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {profileProjections.map((p, idx) => (
                <tr key={idx} className={missionProfile.includes(p.profile.slice(0, 4).toUpperCase()) ? "bg-yellow-100 font-bold" : ""}>
                  <td className="p-2.5 border-r border-black font-bold">{p.profile}</td>
                  <td className="p-2.5 border-r border-black">{p.rate}</td>
                  <td className="p-2.5 border-r border-black">{p.stress}</td>
                  <td className="p-2.5 font-bold text-blue-950">{p.expectedRul}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
