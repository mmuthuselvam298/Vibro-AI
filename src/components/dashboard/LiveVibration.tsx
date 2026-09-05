import React, { useMemo } from 'react';
import { useSignalStore } from '@/store/signalStore';
import { useEngineStore } from '@/store/engineStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

export const LiveVibration: React.FC = () => {
  const { waveform, features } = useSignalStore();
  const { scenario, dataMode } = useEngineStore();

  const chartData = useMemo(() => {
    return waveform.filter((_, i) => i % 2 === 0);
  }, [waveform]);

  return (
    <div className="neo-card flex flex-col h-[420px] bg-white">
      <div className="flex flex-wrap justify-between items-center mb-3 border-b-4 border-black pb-2 gap-2">
        <h3 className="font-extrabold text-xl uppercase tracking-tight">Live Vibration Trace</h3>
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="border-2 border-black px-2.5 py-1 font-extrabold bg-white shadow-[2px_2px_0px_0px_#000]">
            RMS: {features.rms.toFixed(3)}g
          </div>
          <div className="border-2 border-black px-2.5 py-1 font-extrabold bg-white shadow-[2px_2px_0px_0px_#000]">
            PK: {features.peakAmplitude.toFixed(3)}g
          </div>
        </div>
      </div>

      <div className="flex-1 w-full relative">
        {/* Oscilloscope Grid background */}
        <div
          className="absolute inset-0 border-2 border-dashed border-gray-200 pointer-events-none"
          style={{
            backgroundSize: '40px 40px',
            backgroundImage: 'linear-gradient(to right, #f0f0f0 1px, transparent 1px), linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)'
          }}
        />

        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} hide />
            <YAxis domain={[-8, 8]} width={60} tick={{ fontSize: 12, fontFamily: 'monospace' }} stroke="#000" />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#000"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-black text-[11px] font-mono text-gray-500">
        <span>0.5s Window (Anti-aliased FIR Lowpass)</span>
        <span className="font-bold text-black">
          MODE: {dataMode === 'SIMULATION' ? 'SYNTHETIC KINEMATICS' : 'STM32 SPI STREAM'} ({scenario})
        </span>
      </div>
    </div>
  );
};
