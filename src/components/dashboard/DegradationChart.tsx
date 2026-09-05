import React, { useMemo } from 'react';
import { useEngineStore } from '@/store/engineStore';
import { GuideLink } from './GuideLink';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';

export const DegradationChart: React.FC = () => {
  const { engineHealth, rul, scenario, degradationRate } = useEngineStore();

  const data = useMemo(() => {
    const pts = [];

    // Past 6 historical checkpoints
    for (let i = -50; i < 0; i += 10) {
      const t = Math.abs(i) / 50;
      const h = Math.min(100, Math.max(0, 100 - ((100 - engineHealth) * (1 - t))));
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
      health: Number(engineHealth.toFixed(1)),
      upperBound: Number(Math.min(100, engineHealth + 2).toFixed(1)),
      lowerBound: Number(Math.max(0, engineHealth - 2).toFixed(1)),
      isFuture: false
    });

    // Future prognostic projection based on degradation rate & scenario
    const stepCount = 5;
    for (let step = 1; step <= stepCount; step++) {
      const cycleOffset = Math.round((rul / stepCount) * step);
      const fraction = step / stepCount;
      const projectedHealth = scenario === 'HEALTHY'
        ? Math.max(10, engineHealth - (fraction * 50))
        : Math.max(0, engineHealth - (fraction * (engineHealth - 25)));

      const uncertaintySpread = fraction * 8;

      pts.push({
        cycle: cycleOffset,
        health: Number(projectedHealth.toFixed(1)),
        upperBound: Number(Math.min(100, projectedHealth + uncertaintySpread).toFixed(1)),
        lowerBound: Number(Math.max(0, projectedHealth - uncertaintySpread).toFixed(1)),
        isFuture: true
      });
    }

    return pts;
  }, [engineHealth, rul, scenario, degradationRate]);

  return (
    <div className="neo-card h-full flex flex-col bg-white">
      <div className="flex flex-wrap justify-between items-center mb-3 border-b-2 border-black pb-2 gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-base uppercase tracking-tight">Health Trajectory & RUL</h3>
          <span className="bg-[var(--color-brand-red)] text-white px-1.5 py-0.5 border border-black font-bold text-[10px]">
            FAIL LIMIT: 40%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-500 font-bold hidden sm:inline">
            RATE: {degradationRate.toFixed(2)}%/100c
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
                  const data = payload[0].payload;
                  return (
                    <div className="bg-black text-white p-2 text-xs font-mono border-2 border-white">
                      <div>Cycle: {data.cycle > 0 ? `+${data.cycle}` : data.cycle}</div>
                      <div>Health: {data.health}%</div>
                      <div>Confidence Interval: [{data.lowerBound}%, {data.upperBound}%]</div>
                      <div className="text-[var(--color-brand-yellow)]">
                        {data.isFuture ? 'Prognostic Forecast' : 'Historical Data'}
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

      <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-black text-[11px] font-mono text-gray-500">
        <span>Model: Exponential Hazard + Physics Paris Law</span>
        <span className="font-bold text-black">
          {rul} CYCLES (~{(rul * 0.45).toFixed(0)} FLIGHT HOURS REMAINING)
        </span>
      </div>
    </div>
  );
};
