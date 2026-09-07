import React from 'react';
import { useSignalStore } from '@/store/signalStore';
import { useEngineStore } from '@/store/engineStore';
import { GuideLink } from './GuideLink';
import { JargonTooltip } from './JargonTooltip';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

export const SignalAnalysis: React.FC = () => {
  const { spectrum, features } = useSignalStore();
  const { plainLanguageMode } = useEngineStore();

  return (
    <div className="flex flex-col gap-4">
      <div className="neo-card flex flex-col h-[320px] bg-white">
        <div className="flex flex-wrap justify-between items-center mb-2 border-b-2 border-black pb-2 gap-2">
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base uppercase tracking-tight">
                  {plainLanguageMode ? 'Vibration Frequency Breakdown' : 'Fast Fourier Transform (FFT Spectrum)'}
                </h3>
                <JargonTooltip
                  term="FFT Spectrum (Frequency Breakdown)"
                  explanation="Splits the messy continuous vibration sound into individual frequencies, revealing exactly which internal component is shaking."
                  analogy="Like a prism splitting white light into a rainbow, or Shazam identifying a specific instrument in an orchestra."
                  technicalDetails="512-point Radix-2 Cooley-Tukey FFT with Hanning window to minimize spectral leakage. Displays 0–500 Hz band with defect markers."
                />
              </div>
              <span className="text-[10px] font-mono text-neutral-500 font-bold block">
                {plainLanguageMode ? 'FFT Spectrum (0–500 Hz) • Isolates which part is knocking' : 'Radix-2 FFT • Hanning Windowed • Discrete Bin Resolution'}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black bg-gray-100 hidden sm:inline">
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

        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-200 text-[10px] font-mono text-gray-600">
          <span className="font-bold text-black shrink-0">KEY DEFECT FREQUENCIES:</span>
          <span className="bg-gray-100 px-1.5 py-0.5 border border-black" title="Shaft Rotation Speed (1X)">
            1X: 60Hz (Crankshaft)
          </span>
          <span className="bg-gray-100 px-1.5 py-0.5 border border-black" title="Second harmonic (2X)">
            2X: 120Hz (Alignment)
          </span>
          <span className="bg-yellow-100 text-yellow-900 px-1.5 py-0.5 border border-black font-bold" title="Outer bearing race damage signature">
            BPFO: 150Hz (Bearing Race Fault)
          </span>
          <span className="bg-orange-100 text-orange-900 px-1.5 py-0.5 border border-black font-bold" title="Defect on one of the bearing rolling balls">
            BSF: 80Hz (Bearing Ball Defect)
          </span>
        </div>
      </div>

      {/* Feature Metrics 2x2 Grid with Plain Language Captions */}
      <div className="grid grid-cols-2 gap-3">
        {/* Crest Factor */}
        <div className="neo-card p-3 bg-white flex flex-col justify-between border-2 border-black">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-extrabold uppercase">
                  {plainLanguageMode ? 'Vibration Spikiness' : 'Crest Factor'}
                </span>
                <JargonTooltip
                  term="Crest Factor"
                  explanation="Measures how spiky the vibration wave is compared to its average background noise."
                  analogy="A steady drumbeat has a low crest factor; an occasional hammer strike has a high crest factor."
                  technicalDetails="Crest Factor = Peak Amplitude / RMS. Values > 4.0 strongly indicate bearing impacts or tooth breakage."
                />
              </div>
              <span className="text-[9px] font-mono text-gray-500 font-semibold block">
                {plainLanguageMode ? 'Crest Factor (Peak / RMS ratio)' : 'Crest Factor (Peak-to-RMS)'}
              </span>
            </div>
            <GuideLink sectionId="06-signal-processing" label="?" />
          </div>
          <div className="text-2xl font-mono font-bold my-1">{features.crestFactor.toFixed(2)}</div>
          <div className="text-[10px] font-mono text-gray-700 leading-tight bg-neutral-50 p-1 border border-gray-200">
            {features.crestFactor > 4.0
              ? "⚠️ High sharp spikes detected — bearing impact or knocking present"
              : "✓ Smooth waveform — no violent impact knocking (<3.5)"}
          </div>
        </div>

        {/* Kurtosis */}
        <div className="neo-card p-3 bg-white flex flex-col justify-between border-2 border-black">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-extrabold uppercase">
                  {plainLanguageMode ? 'Shock Outlier Severity' : 'Kurtosis'}
                </span>
                <JargonTooltip
                  term="Kurtosis"
                  explanation="Quantifies extreme outlier shocks buried inside regular engine vibrations."
                  analogy="Normal engine hum is a bell curve (~3.0). Metal-on-metal chipping creates extreme outliers that push Kurtosis above 4.0."
                  technicalDetails="4th standardized statistical moment. Gaussian noise = 3.0; Kurtosis > 3.5 signals early-stage mechanical flaking."
                />
              </div>
              <span className="text-[9px] font-mono text-gray-500 font-semibold block">
                {plainLanguageMode ? 'Kurtosis (4th Statistical Moment)' : 'Kurtosis (Peakiness & Outliers)'}
              </span>
            </div>
            <GuideLink sectionId="06-signal-processing" label="?" />
          </div>
          <div className="text-2xl font-mono font-bold my-1">{features.kurtosis.toFixed(2)}</div>
          <div className="text-[10px] font-mono text-gray-700 leading-tight bg-neutral-50 p-1 border border-gray-200">
            {features.kurtosis > 3.5
              ? "⚠️ Heavy-tailed shock peaks — micro-flaking inside bearings"
              : "✓ Normal bell-curve vibrations (~3.0 Gaussian)"}
          </div>
        </div>

        {/* Skewness */}
        <div className="neo-card p-3 bg-white flex flex-col justify-between border-2 border-black">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-extrabold uppercase">
                  {plainLanguageMode ? 'Wave Asymmetry' : 'Skewness'}
                </span>
                <JargonTooltip
                  term="Skewness"
                  explanation="Checks whether vibration shocks pull in one direction rather than swinging evenly."
                  analogy="A balanced tire bounces equally up and down; a flat-spotted tire hits hard on only one side."
                  technicalDetails="3rd standardized moment. Asymmetry > ±0.3 signals directional thrust loads or piston slap."
                />
              </div>
              <span className="text-[9px] font-mono text-gray-500 font-semibold block">
                {plainLanguageMode ? 'Skewness (3rd Statistical Moment)' : 'Skewness (Directional Bias)'}
              </span>
            </div>
            <GuideLink sectionId="06-signal-processing" label="?" />
          </div>
          <div className="text-2xl font-mono font-bold my-1">{features.skewness.toFixed(2)}</div>
          <div className="text-[10px] font-mono text-gray-700 leading-tight bg-neutral-50 p-1 border border-gray-200">
            {Math.abs(features.skewness) > 0.3
              ? "⚠️ Asymmetric directional impact — one-sided piston/bearing knock"
              : "✓ Balanced symmetric stroke motion (±0.2)"}
          </div>
        </div>

        {/* HF Energy Ratio */}
        <div className="neo-card p-3 bg-white flex flex-col justify-between border-2 border-black">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-extrabold uppercase">
                  {plainLanguageMode ? 'Friction Rub Energy' : 'HF Energy Ratio'}
                </span>
                <JargonTooltip
                  term="High-Frequency Energy Ratio"
                  explanation="Measures the percentage of total vibration coming from ultrasonic high-frequency friction."
                  analogy="Engine hum is low bass; metal scraping against dry metal produces an ear-piercing high screech."
                  technicalDetails="Ratio of energy above 200 Hz divided by total broadband energy. Elevated HF precedes macro vibrations."
                />
              </div>
              <span className="text-[9px] font-mono text-gray-500 font-semibold block">
                {plainLanguageMode ? 'High-Frequency Friction Ratio (>200 Hz)' : 'Band-Pass HF Power Spectral Ratio'}
              </span>
            </div>
            <GuideLink sectionId="06-signal-processing" label="?" />
          </div>
          <div className="text-2xl font-mono font-bold my-1">{(features.highFreqEnergyRatio * 100).toFixed(1)}%</div>
          <div className="text-[10px] font-mono text-gray-700 leading-tight bg-neutral-50 p-1 border border-gray-200">
            {features.highFreqEnergyRatio > 0.15
              ? "⚠️ High ultrasonic friction — lubrication dry spot or surface contact"
              : "✓ Low ultrasonic rubbing (<12%) — well-lubricated surfaces"}
          </div>
        </div>
      </div>
    </div>
  );
};
