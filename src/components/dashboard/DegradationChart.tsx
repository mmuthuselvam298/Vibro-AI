import React, { useMemo } from 'react';
import { useEngineStore } from '@/store/engineStore';
import { useBackendEngineState } from '@/hooks/useBackendEngineState';
import { GuideLink } from './GuideLink';
import { JargonTooltip } from './JargonTooltip';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';

export const DegradationChart: React.FC = () => {
  const { engineHealth, rul: simRul, scenario, degradationRate: simDegradationRate, plainLanguageMode } = useEngineStore();
  const { digitalTwin, prognostics, backendConnected } = useBackendEngineState();

  const isBackendActive = Boolean(backendConnected && (digitalTwin || prognostics));

  const effectiveRul = prognostics?.rul_nominal_cycles ?? digitalTwin?.prognostics?.rul_nominal_cycles ?? simRul;
  const effectiveDegradationRate = digitalTwin?.health_trajectory?.degradation_rate_per_hour != null
    ? digitalTwin.health_trajectory.degradation_rate_per_hour
    : simDegradationRate;
  const currentHealth = digitalTwin?.overall_health_score ?? engineHealth;

  const data = useMemo(() => {
    const pts = [];

    // Past historical checkpoints
    for (let i = -50; i < 0; i += 10) {
      const t = Math.abs(i) / 50;
      const h = isBackendActive && digitalTwin?.health_trajectory?.previous_health != null
        ? Math.min(100, Math.max(0, currentHealth + ((digitalTwin.health_trajectory.previous_health - currentHealth) * t)))
        : Math.min(100, Math.max(0, 100 - ((100 - currentHealth) * (1 - t))));
      pts.push({
        cycle: i,
        health: Number(h.toFixed(1)),
        upperBound: Number(Math.min(100, h + 3).toFixed(1)),
        lowerBound: Number(Math.max(0, h - 3).toFixed(1)),
        isFuture: false
      });
    }

    // Current point (Cycle 0)
    pts.push({
      cycle: 0,
      health: Number(currentHealth.toFixed(1)),
      upperBound: Number(Math.min(100, currentHealth + 2).toFixed(1)),
      lowerBound: Number(Math.max(0, currentHealth - 2).toFixed(1)),
      isFuture: false
    });

    // Future prognostic projection based on effective RUL and uncertainty bounds
    const stepCount = 5;
    const minCycles = prognostics?.rul_min_cycles ?? digitalTwin?.prognostics?.rul_min_cycles ?? (effectiveRul * 0.75);
    const maxCycles = prognostics?.rul_max_cycles ?? digitalTwin?.prognostics?.rul_max_cycles ?? (effectiveRul * 1.25);
    const uncertaintyRatio = (maxCycles - minCycles) / (effectiveRul || 1);

    for (let step = 1; step <= stepCount; step++) {
      const cycleOffset = Math.round((effectiveRul / stepCount) * step);
      const fraction = step / stepCount;
      const projectedHealth = scenario === 'HEALTHY' && !isBackendActive
        ? Math.max(10, currentHealth - (fraction * 50))
        : Math.max(0, currentHealth - (fraction * (currentHealth - 30)));

      const uncertaintySpread = fraction * Math.max(5, uncertaintyRatio * 10);

      pts.push({
        cycle: cycleOffset,
        health: Number(projectedHealth.toFixed(1)),
        upperBound: Number(Math.min(100, projectedHealth + uncertaintySpread).toFixed(1)),
        lowerBound: Number(Math.max(0, projectedHealth - uncertaintySpread).toFixed(1)),
        isFuture: true
      });
    }

    return pts;
  }, [isBackendActive, digitalTwin, prognostics, currentHealth, effectiveRul, scenario]);

  return (
    <div className="neo-card h-full flex flex-col bg-white">
      <div className="flex flex-wrap justify-between items-center mb-3 border-b-2 border-black pb-2 gap-2">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-base uppercase tracking-tight">
                {plainLanguageMode ? 'Time Left Before Maintenance Is Needed' : 'Health Trajectory & RUL'}
              </h3>
              <JargonTooltip
                term="Remaining Useful Life (RUL)"
                explanation="Prototype decision-support estimate of remaining operational cycles before reaching the critical 40% maintenance threshold. Not a certified airworthiness determination."
                analogy="Like the 'distance to empty' estimate on your car dashboard, forecasting mechanical wear trends."
                technicalDetails="Derived from backend fused health history & degradation rate modeling, bounded by confidence intervals."
              />
            </div>
            <span className="text-[10px] font-mono text-neutral-500 font-bold block">
              {plainLanguageMode
                ? 'Prototype RUL estimate • Maintenance threshold at 40%'
                : 'Degradation Trajectory Vector & Bounded Estimate'}
            </span>
          </div>
          <span className="bg-[var(--color-brand-red)] text-white px-1.5 py-0.5 border border-black font-bold text-[10px] shrink-0">
            FAIL LIMIT: 40%
          </span>
          {isBackendActive ? (
            <span className="bg-emerald-100 text-emerald-900 border border-emerald-500 px-1.5 py-0.5 font-mono font-bold text-[9px] shrink-0">
              BACKEND TWIN
            </span>
          ) : (
            <span className="bg-neutral-100 text-neutral-600 border border-neutral-400 px-1.5 py-0.5 font-mono font-bold text-[9px] shrink-0">
              SIM FALLBACK
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-500 font-bold hidden sm:inline">
            RATE: {effectiveDegradationRate.toFixed(2)}%/100c
          </span>
          <GuideLink sectionId="10-rul" label="RUL Model" />
        </div>
      </div>

      <div className="flex-1 w-full min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 15, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="cycle"
              type="number"
              tick={{ fontSize: 11, fontFamily: 'monospace' }}
              label={{ value: 'Operational Cycles (Relative to Now)', position: 'insideBottom', offset: -10, fontSize: 11, fontWeight: 'bold' }}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontFamily: 'monospace' }} />

            <ReferenceLine y={40} stroke="#FF3B30" strokeWidth={2} strokeDasharray="5 5" label={{ value: 'FAIL THRESHOLD (40%)', position: 'insideTopLeft', fontSize: 10, fill: '#FF3B30', fontWeight: 'bold' }} />
            <ReferenceLine x={0} stroke="#000" strokeWidth={2} label={{ value: 'NOW', position: 'top', fontWeight: 'bold', fontSize: 11 }} />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-black text-white p-2 text-xs font-mono border-2 border-white">
                      <div>Cycle: {item.cycle > 0 ? `+${item.cycle}` : item.cycle}</div>
                      <div>Health: {item.health}%</div>
                      <div>Confidence Interval: [{item.lowerBound}%, {item.upperBound}%]</div>
                      <div className="text-[var(--color-brand-yellow)]">
                        {item.isFuture ? 'Prognostic Forecast' : 'Historical Data'}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="health"
              stroke="#0A2540"
              strokeWidth={3}
              fill="#0A2540"
              fillOpacity={0.2}
              isAnimationActive={false}
              activeDot={{ r: 5, fill: '#FFD500', stroke: '#000', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap justify-between items-center mt-2 pt-2 border-t-2 border-black text-[11px] font-mono text-gray-500 gap-1">
        <span>
          {isBackendActive
            ? 'Source: Backend Digital Twin Trajectory'
            : 'Model: Exponential Hazard + Physics Paris Law (Simulation)'}
        </span>
        <span className="font-bold text-black">
          PROTOTYPE RUL ESTIMATE: {effectiveRul} CYCLES (~{(effectiveRul * 0.45).toFixed(0)} FLT HRS)
        </span>
      </div>
    </div>
  );
};
