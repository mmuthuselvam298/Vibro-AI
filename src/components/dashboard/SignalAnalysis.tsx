import React from 'react';
import { useSignalStore } from '@/store/signalStore';
import { GuideLink } from './GuideLink';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

export const SignalAnalysis: React.FC = () => {
  const { spectrum, features } = useSignalStore();

  return (
    <div className="flex flex-col gap-4">
      <div className="neo-card flex flex-col h-[300px] bg-white">
        <div className="flex flex-wrap justify-between items-center mb-3 border-b-2 border-black pb-2 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base uppercase tracking-tight">Fast Fourier Transform (FFT)</h3>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black bg-gray-100">
              0 - 500 Hz
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gray-500 font-bold hidden sm:inline">
              Hanning Windowed
            </span>
            <GuideLink sectionId="06-signal-processing" label="FFT Guide" />
          </div>
        </div>

        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spectrum} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={[0, 500]}
                tick={{ fontSize: 11, fontFamily: 'monospace' }}
                label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -4, fontSize: 10, fontWeight: 'bold' }}
              />
              <YAxis domain={[0, 110]} hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-black text-white p-2 text-xs font-mono border-2 border-white shadow-lg">
                        <div>Frequency: {data.time} Hz</div>
                        <div>Magnitude: {data.value} dB</div>
                        {data.label && <div className="text-[var(--color-brand-yellow)] font-bold">{data.label}</div>}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="step"
                dataKey="value"
                stroke="#0A2540"
                fill="#0A2540"
                fillOpacity={0.25}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-200 text-[10px] font-mono text-gray-600">
          <span className="font-bold">SPECTRAL MARKERS:</span>
          <span className="bg-gray-100 px-1 border border-black">1X: 60Hz (Shaft)</span>
          <span className="bg-gray-100 px-1 border border-black">2X: 120Hz (Harmonic)</span>
          <span className="bg-gray-100 px-1 border border-black">BPFO: 150Hz (Outer-Race)</span>
          <span className="bg-gray-100 px-1 border border-black">BSF: 80Hz (Ball Spin)</span>
        </div>
      </div>

      {/* Feature Metrics 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="neo-card p-3 bg-white flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase text-gray-500">Crest Factor</span>
            <GuideLink sectionId="06-signal-processing" label="?" />
          </div>
          <div className="text-2xl font-mono font-bold my-1">{features.crestFactor.toFixed(2)}</div>
          <div className="text-[10px] font-mono text-gray-600 leading-tight">
            {features.crestFactor > 4.0 ? "Impulsive shock impacts detected" : "Nominal operational ratio (<3.5)"}
          </div>
        </div>

        <div className="neo-card p-3 bg-white flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase text-gray-500">Kurtosis</span>
            <GuideLink sectionId="06-signal-processing" label="?" />
          </div>
          <div className="text-2xl font-mono font-bold my-1">{features.kurtosis.toFixed(2)}</div>
          <div className="text-[10px] font-mono text-gray-600 leading-tight">
            {features.kurtosis > 3.5 ? "Heavy-tailed non-Gaussian distribution" : "Normal Gaussian profile (~3.0)"}
          </div>
        </div>

        <div className="neo-card p-3 bg-white flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase text-gray-500">Skewness</span>
            <GuideLink sectionId="06-signal-processing" label="?" />
          </div>
          <div className="text-2xl font-mono font-bold my-1">{features.skewness.toFixed(2)}</div>
          <div className="text-[10px] font-mono text-gray-600 leading-tight">
            {Math.abs(features.skewness) > 0.3 ? "Asymmetric waveform shock loading" : "Symmetric wave cycle"}
          </div>
        </div>

        <div className="neo-card p-3 bg-white flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase text-gray-500">HF Energy Ratio</span>
            <GuideLink sectionId="06-signal-processing" label="?" />
          </div>
          <div className="text-2xl font-mono font-bold my-1">{(features.highFreqEnergyRatio * 100).toFixed(1)}%</div>
          <div className="text-[10px] font-mono text-gray-600 leading-tight">
            {features.highFreqEnergyRatio > 0.15 ? "Elevated ultrasonic friction energy" : "Nominal low-frequency energy"}
          </div>
        </div>
      </div>
    </div>
  );
};
