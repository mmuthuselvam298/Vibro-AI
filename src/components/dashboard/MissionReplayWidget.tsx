import React from 'react';
import { useEngineStore, type MissionProfileType } from '@/store/engineStore';
import { GuideLink } from './GuideLink';
import { Play, Pause, RotateCcw, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MissionReplayWidget: React.FC = () => {
  const {
    missionProfile,
    setMissionProfile,
    missionTimeSeconds,
    missionTotalDuration,
    setMissionTimeSeconds,
    isSimulating,
    toggleSimulation,
    replaySpeed,
    setReplaySpeed,
    operatingCycle
  } = useEngineStore();

  const profiles: { type: MissionProfileType; label: string; desc: string }[] = [
    { type: 'ENDURANCE_CRUISE', label: 'Endurance Cruise', desc: 'MALE UAV standard loiter at 10,000 ft, steady cruise RPM' },
    { type: 'HIGH_ALTITUDE', label: 'High-Altitude Patrol', desc: '18,000 ft operational ceiling, low ambient pressure, high throttle' },
    { type: 'HOT_WEATHER', label: 'Hot-Weather Loiter', desc: '45°C ambient thermal stress, reduced cooling efficiency' },
    { type: 'RAPID_THROTTLE', label: 'Rapid-Throttle Evasion', desc: 'Dynamic transient RPM maneuvers with cyclical torque spikes' },
  ];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPct = (missionTimeSeconds / missionTotalDuration) * 100;

  return (
    <div className="neo-card bg-[var(--color-brand-light)] flex flex-col justify-between">
      <div className="flex flex-wrap justify-between items-center mb-3 border-b-2 border-black pb-2 gap-2">
        <div className="flex items-center gap-2">
          <Compass size={18} className="stroke-[2.5]" />
          <h3 className="font-extrabold text-base uppercase tracking-tight">Mission Simulator & Telemetry Replay</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black bg-white">
            CYCLE: #{operatingCycle.toLocaleString()}
          </span>
          <GuideLink sectionId="13-mission-simulation-replay" label="Mission Replay Guide" />
        </div>
      </div>

      {/* Mission Profile Selection Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        {profiles.map((p) => {
          const isActive = missionProfile === p.type;
          return (
            <button
              key={p.type}
              onClick={() => setMissionProfile(p.type)}
              className={cn(
                "p-2 border-2 text-left transition-all",
                isActive
                  ? "border-black bg-black text-white shadow-[var(--shadow-neobrutalism-sm)] translate-x-0.5 translate-y-0.5 font-bold"
                  : "border-black bg-white hover:bg-gray-100 font-semibold"
              )}
            >
              <div className="text-xs uppercase leading-tight font-bold">{p.label}</div>
              <div className={cn("text-[10px] line-clamp-1 mt-0.5", isActive ? "text-gray-300" : "text-gray-500")}>
                {p.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Timeline Scrubber */}
      <div className="p-3 bg-white border-2 border-black mb-3">
        <div className="flex justify-between items-center text-xs font-mono font-bold mb-1">
          <span>MISSION ELAPSED: {formatTime(missionTimeSeconds)}</span>
          <span>TOTAL DURATION: {formatTime(missionTotalDuration)}</span>
        </div>
        <input
          type="range"
          min="0"
          max={missionTotalDuration}
          value={missionTimeSeconds}
          onChange={(e) => setMissionTimeSeconds(Number(e.target.value))}
          className="w-full h-3 bg-gray-200 border-2 border-black appearance-none cursor-pointer accent-black"
        />
        <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1">
          <span>00:00 (Takeoff)</span>
          <span>{progressPct.toFixed(1)}% Completed</span>
          <span>120:00 (Landing)</span>
        </div>
      </div>

      {/* Replay Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t-2 border-black font-mono">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSimulation}
            className="px-3 py-1.5 border-2 border-black bg-white hover:bg-[var(--color-brand-yellow)] font-bold text-xs flex items-center gap-1.5 shadow-[var(--shadow-neobrutalism-sm)] active:translate-x-0.5 active:translate-y-0.5"
          >
            {isSimulating ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Play</>}
          </button>

          <button
            onClick={() => setMissionTimeSeconds(0)}
            className="px-2 py-1.5 border-2 border-black bg-white hover:bg-gray-100 font-bold text-xs flex items-center gap-1"
            title="Reset to 00:00"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <span className="font-bold text-gray-600 mr-1">SPEED:</span>
          {[1, 2, 5].map((spd) => (
            <button
              key={spd}
              onClick={() => setReplaySpeed(spd)}
              className={cn(
                "px-2 py-1 border-2 border-black text-xs font-bold",
                replaySpeed === spd ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
              )}
            >
              {spd}X
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
