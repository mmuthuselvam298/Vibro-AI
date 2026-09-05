import React from 'react';
import { LiveVibration } from '@/components/dashboard/LiveVibration';
import { SignalAnalysis } from '@/components/dashboard/SignalAnalysis';
import { useSignalStore } from '@/store/signalStore';
import { useEngineStore } from '@/store/engineStore';
import { GuideLink } from '@/components/dashboard/GuideLink';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { Zap, Activity, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SignalAnalysisPage: React.FC = () => {
  const { spectrogram, wpdBands } = useSignalStore();
  const { scenario } = useEngineStore();

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto animate-in fade-in duration-300 pb-12">
      <div className="flex flex-wrap justify-between items-center border-b-4 border-black pb-2 gap-2">
        <div>
          <h2 className="text-3xl font-bold uppercase tracking-tight">Signal Analysis & Advanced DSP</h2>
          <p className="text-xs font-mono text-gray-600 mt-1">
            Triaxial vibration conditioning, Fast Fourier Transform, Short-Time Fourier Spectrogram, and Wavelet Decomposition.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="neo-badge bg-[var(--color-brand-blue)] text-white">
            SAMPLE RATE: 1.0 kHz
          </span>
          <GuideLink sectionId="06-signal-processing" label="DSP Chapter" />
        </div>
      </div>

      {/* Main Signal Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveVibration />
        <SignalAnalysis />
      </div>

      {/* STFT Spectrogram & Wavelet Packet Decomposition (WPD) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Short-Time Fourier Transform (STFT) Spectrogram */}
        <div className="neo-card bg-white flex flex-col h-[380px]">
          <div className="flex justify-between items-center mb-3 border-b-4 border-black pb-2">
            <div className="flex items-center gap-2">
              <Zap size={20} />
              <h3 className="font-bold text-xl uppercase">STFT Spectrogram Matrix</h3>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 border border-black bg-gray-100">
              TIME-FREQUENCY
            </span>
          </div>

          <div className="text-xs font-mono text-gray-500 mb-2">
            Time-frequency energy density matrix across 1.0s sliding windows:
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full border-2 border-black font-mono text-xs text-center">
              <thead className="bg-gray-100 border-b-2 border-black">
                <tr>
                  <th className="p-2 border-r border-black font-bold text-left">TIME WINDOW</th>
                  <th className="p-2 border-r border-black">1X (60Hz)</th>
                  <th className="p-2 border-r border-black">2X (120Hz)</th>
                  <th className="p-2 border-r border-black font-bold text-[var(--color-brand-blue)]">BPFO (150Hz)</th>
                  <th className="p-2 border-r border-black">4X (240Hz)</th>
                  <th className="p-2 font-bold text-red-700">HF NOISE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {spectrogram.map((bin, i) => (
                  <tr key={i} className={bin.timeBin === 'CURRENT' ? 'bg-yellow-50 font-bold' : ''}>
                    <td className="p-2 border-r border-black font-bold text-left">{bin.timeBin}</td>
                    <td className="p-2 border-r border-black">{bin.f0_60Hz} dB</td>
                    <td className="p-2 border-r border-black">{bin.f1_120Hz} dB</td>
                    <td className={cn("p-2 border-r border-black", bin.f2_150Hz_BPFO > 50 ? "bg-red-100 text-red-900 font-bold" : "")}>
                      {bin.f2_150Hz_BPFO} dB
                    </td>
                    <td className="p-2 border-r border-black">{bin.f3_240Hz} dB</td>
                    <td className={cn("p-2", bin.f5_HighFreq > 50 ? "bg-red-100 text-red-900 font-bold" : "")}>
                      {bin.f5_HighFreq} dB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-[10px] font-mono text-gray-500">
            * STFT highlights stationary vs non-stationary harmonic evolution during flight maneuvers.
          </div>
        </div>

        {/* Wavelet Packet Decomposition (WPD) Sub-Bands */}
        <div className="neo-card bg-white flex flex-col h-[380px]">
          <div className="flex justify-between items-center mb-3 border-b-4 border-black pb-2">
            <div className="flex items-center gap-2">
              <Activity size={20} />
              <h3 className="font-bold text-xl uppercase">Wavelet Sub-Band Energy (WPD)</h3>
            </div>
            <GuideLink sectionId="06-signal-processing" label="WPD Theory" />
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wpdBands} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="band" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-black text-white p-2 text-xs font-mono border-2 border-white">
                          <div className="font-bold">{d.band} ({d.range})</div>
                          <div>Energy: {d.energy}%</div>
                          {d.isDominant && <div className="text-[var(--color-brand-yellow)] font-bold">Dominant Fault Band</div>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="energy"
                  fill="#0A2540"
                  stroke="#000"
                  strokeWidth={2}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between text-[10px] font-mono text-gray-600 mt-2 pt-2 border-t border-gray-200">
            <span>Daubechies 4 (db4) Mother Wavelet • 3-Level Decomposition</span>
            <span className="font-bold">SCENARIO: {scenario}</span>
          </div>
        </div>

      </div>

      {/* DSP Processing Pipeline Banner */}
      <div className="neo-card bg-[var(--color-brand-light)]">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={20} />
          <h3 className="font-bold text-lg uppercase">Real-Time Sensor Ingestion & Filtering Pipeline</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 font-mono text-xs font-bold text-center">
          <div className="bg-white p-3 border-2 border-black">
            <div className="text-[10px] text-gray-500">STAGE 1</div>
            <div>ADXL355 Raw SPI</div>
            <div className="text-[10px] text-gray-400 font-normal mt-1">20-bit @ 1 kHz</div>
          </div>
          <div className="bg-white p-3 border-2 border-black">
            <div className="text-[10px] text-gray-500">STAGE 2</div>
            <div>Anti-Aliasing Filter</div>
            <div className="text-[10px] text-gray-400 font-normal mt-1">Butterworth 450Hz Lowpass</div>
          </div>
          <div className="bg-white p-3 border-2 border-black">
            <div className="text-[10px] text-gray-500">STAGE 3</div>
            <div>Hanning Windowing</div>
            <div className="text-[10px] text-gray-400 font-normal mt-1">512-Sample Buffer</div>
          </div>
          <div className="bg-white p-3 border-2 border-black">
            <div className="text-[10px] text-gray-500">STAGE 4</div>
            <div>FFT / STFT / WPD</div>
            <div className="text-[10px] text-gray-400 font-normal mt-1">Spectral Decomposition</div>
          </div>
          <div className="bg-[var(--color-brand-yellow)] p-3 border-2 border-black">
            <div className="text-[10px] text-black">STAGE 5</div>
            <div>Feature Vector Extraction</div>
            <div className="text-[10px] text-black font-normal mt-1">RMS, CF, Kurt, Skew → AI</div>
          </div>
        </div>
      </div>
    </div>
  );
};
