import { create } from 'zustand';
import type { ScenarioType } from './engineStore';

export interface DataPoint {
  time: number;
  value: number;
  label?: string;
}

export interface SpectrogramBin {
  timeBin: string;
  f0_60Hz: number;
  f1_120Hz: number;
  f2_150Hz_BPFO: number;
  f3_240Hz: number;
  f4_360Hz: number;
  f5_HighFreq: number;
}

export interface WpdBand {
  band: string;
  range: string;
  energy: number;
  isDominant: boolean;
}

export interface FeatureMetrics {
  rms: number;
  peakAmplitude: number;
  crestFactor: number;
  kurtosis: number;
  skewness: number;
  highFreqEnergyRatio: number;
}

interface SignalState {
  waveform: DataPoint[];
  spectrum: DataPoint[];
  spectrogram: SpectrogramBin[];
  wpdBands: WpdBand[];
  features: FeatureMetrics;

  generateSignal: (scenario: ScenarioType, timeOffset: number) => void;
}

export const useSignalStore = create<SignalState>((set) => ({
  waveform: [],
  spectrum: [],
  spectrogram: [],
  wpdBands: [],
  features: {
    rms: 0.85,
    peakAmplitude: 1.25,
    crestFactor: 1.47,
    kurtosis: 3.02,
    skewness: 0.05,
    highFreqEnergyRatio: 0.08
  },

  generateSignal: (scenario: ScenarioType, timeOffset: number) => {
    const SAMPLE_RATE = 1000; // Hz
    const DURATION = 0.5; // seconds (500 samples)
    const NUM_SAMPLES = SAMPLE_RATE * DURATION;

    const newWaveform: DataPoint[] = [];
    const newSpectrum: DataPoint[] = [];

    // Base engine fundamental rotation frequency (60 Hz at 3,600 RPM)
    const f0 = 60;

    let rmsSum = 0;
    let peak = 0;
    let sumM3 = 0;
    let sumM4 = 0;
    let highFreqEnergySum = 0;

    for (let i = 0; i < NUM_SAMPLES; i++) {
      const t = (i / SAMPLE_RATE) + timeOffset;
      let val = 0;

      // Baseline shaft rotation harmonics (1X, 2X, 3X) + structural noise
      val += 1.0 * Math.sin(2 * Math.PI * f0 * t);
      val += 0.35 * Math.sin(2 * Math.PI * (2 * f0) * t + 0.5);
      val += 0.15 * Math.sin(2 * Math.PI * (3 * f0) * t + 1.2);
      val += (Math.random() - 0.5) * 0.35; // Sensor baseline noise

      // Scenario-specific physics vibration signatures
      switch (scenario) {
        case 'EARLY_BEARING_WEAR': {
          // BPFO impacts (~150 Hz)
          const bpfo = 150;
          const impactPhase = (t % (1 / bpfo)) * bpfo;
          const impact = Math.exp(-45 * impactPhase) * Math.sin(2 * Math.PI * 1200 * t) * 1.8;
          val += impact;
          val += (Math.random() - 0.5) * 0.5;
          break;
        }
        case 'SEVERE_BEARING_WEAR': {
          // Strong BPFO impacts (~150 Hz) + harmonics (300Hz, 450Hz) + high noise
          const bpfo = 150;
          const impactPhase = (t % (1 / bpfo)) * bpfo;
          const impact = Math.exp(-25 * impactPhase) * Math.sin(2 * Math.PI * 1200 * t) * 4.2;
          val += impact;
          val += 0.9 * Math.sin(2 * Math.PI * 300 * t);
          val += (Math.random() - 0.5) * 1.4;
          break;
        }
        case 'PISTON_SLAP': {
          // Transient 30 Hz impact burst (Top & Bottom dead center 4-stroke cycle)
          const pistonFreq = 30;
          const phase = t % (1 / pistonFreq);
          if (phase < 0.006) {
            val += (Math.random() - 0.5) * 6.5;
          }
          break;
        }
        case 'VALVE_LASH': {
          // Valve seating impacts (30 Hz) + 4X harmonic growth (240 Hz)
          const valveFreq = 30;
          const impact = Math.pow(Math.sin(2 * Math.PI * valveFreq * t), 18) * 2.8;
          val += impact;
          val += 0.85 * Math.sin(2 * Math.PI * 240 * t);
          break;
        }
        case 'ROLLING_ELEMENT_DEFECT': {
          // Ball Spin Frequency BSF (~80Hz) amplitude modulated by cage Fundamental Train Frequency FTF (~24Hz)
          const bsf = 80;
          const ftf = 24;
          const modulation = 0.5 + 0.5 * Math.sin(2 * Math.PI * ftf * t);
          const impact = Math.pow(Math.sin(2 * Math.PI * bsf * t), 14) * 3.4 * modulation;
          val += impact;
          break;
        }
        case 'MISFIRE': {
          // 0.5X sub-harmonic (30 Hz) torque deficit + angular acceleration ripple
          val += 1.8 * Math.sin(2 * Math.PI * 30 * t);
          val += (Math.random() - 0.5) * 1.2;
          break;
        }
        case 'INJECTOR_ABNORMALITY': {
          // Acoustic injection pulse jitter + high frequency spray turbulence
          val += 0.6 * Math.sin(2 * Math.PI * 180 * t);
          val += (Math.random() - 0.5) * 0.9;
          break;
        }
        case 'LUBRICATION_ISSUE': {
          // Boundary friction high-frequency broadband hash + bearing rumble
          val += 0.7 * Math.sin(2 * Math.PI * 90 * t);
          val += (Math.random() - 0.5) * 2.6; // High broadband friction
          break;
        }
        case 'OVERHEATING': {
          // Thermal expansion contact friction + low-frequency structural resonance
          val += 0.9 * Math.sin(2 * Math.PI * 45 * t);
          val += 0.5 * Math.sin(2 * Math.PI * 240 * t);
          val += (Math.random() - 0.5) * 1.8;
          break;
        }
        case 'SENSOR_DRIFT': {
          // DC offset bias (+1.1g) + standard healthy waveform
          val += 1.1;
          break;
        }
        case 'COMBUSTION_INSTABILITY': {
          // Flame pressure oscillations + high frequency knock bursts
          val += 1.4 * Math.sin(2 * Math.PI * 4.5 * t) * Math.sin(2 * Math.PI * 60 * t);
          val += (Math.random() - 0.5) * 1.6;
          break;
        }
        default:
          break;
      }

      newWaveform.push({ time: t, value: Number(val.toFixed(3)) });
      rmsSum += val * val;
      if (Math.abs(val) > peak) peak = Math.abs(val);
    }

    const rms = Math.sqrt(rmsSum / NUM_SAMPLES);
    const crestFactor = peak / (rms || 1);

    // Compute central statistical moments (Kurtosis, Skewness)
    for (const pt of newWaveform) {
      const diff = pt.value - (scenario === 'SENSOR_DRIFT' ? 1.1 : 0);
      sumM3 += Math.pow(diff, 3);
      sumM4 += Math.pow(diff, 4);
    }

    const variance = rmsSum / NUM_SAMPLES;
    const stdDev = Math.sqrt(variance) || 1;
    let kurtosis = sumM4 / (NUM_SAMPLES * Math.pow(variance, 2));
    let skewness = sumM3 / (NUM_SAMPLES * Math.pow(stdDev, 3));

    if (isNaN(kurtosis) || !isFinite(kurtosis)) kurtosis = 3.0;
    if (isNaN(skewness) || !isFinite(skewness)) skewness = 0.0;

    // Generate accurate FFT Spectrum (0 - 500 Hz) with identified peaks
    for (let f = 0; f <= 500; f += 5) {
      let mag = 2.0 + Math.random() * 2.5; // noise floor

      // 1X fundamental (60 Hz)
      if (f === 60) mag = 92 + Math.random() * 5;
      // 2X 2nd harmonic (120 Hz)
      if (f === 120) mag = 34 + Math.random() * 4;
      // 3X 3rd harmonic (180 Hz)
      if (f === 180) mag = 16 + Math.random() * 3;

      // Scenario spectral signatures
      if (scenario === 'EARLY_BEARING_WEAR' || scenario === 'SEVERE_BEARING_WEAR') {
        if (f === 150) mag = scenario === 'SEVERE_BEARING_WEAR' ? 88 : 45; // BPFO
        if (f === 300) mag = scenario === 'SEVERE_BEARING_WEAR' ? 62 : 18; // 2x BPFO
        if (f === 450) mag = scenario === 'SEVERE_BEARING_WEAR' ? 38 : 10; // 3x BPFO
        if (f > 250 && scenario === 'SEVERE_BEARING_WEAR') mag += Math.random() * 18;
      } else if (scenario === 'PISTON_SLAP') {
        if (f === 30) mag = 55; // Piston event 0.5X
        if (f > 200) mag += Math.random() * 22; // Broadband slap impact
      } else if (scenario === 'VALVE_LASH') {
        if (f === 30) mag = 48; // Valve stroke
        if (f === 240) mag = 72; // 4X valve train excitation
      } else if (scenario === 'ROLLING_ELEMENT_DEFECT') {
        if (f === 80) mag = 68; // BSF peak
        if (f === 160) mag = 35; // 2x BSF
        if (f === 24) mag = 42; // FTF cage frequency
      } else if (scenario === 'MISFIRE') {
        if (f === 30) mag = 78; // Sub-harmonic 0.5X torque ripple
      } else if (scenario === 'LUBRICATION_ISSUE') {
        if (f >= 100) mag += Math.random() * 28; // Elevated broadband friction
      } else if (scenario === 'COMBUSTION_INSTABILITY') {
        if (f === 60) mag = 105;
        if (f >= 50 && f <= 70) mag += 25; // Sidebands around fundamental
      }

      newSpectrum.push({
        time: f,
        value: Number(mag.toFixed(1)),
        label: f === 60 ? '1X (60Hz)' : f === 120 ? '2X' : f === 150 ? 'BPFO' : f === 80 ? 'BSF' : f === 240 ? '4X' : f === 30 ? '0.5X' : undefined
      });

      if (f > 250) highFreqEnergySum += mag;
    }

    const highFreqEnergyRatio = highFreqEnergySum / (newSpectrum.reduce((acc, p) => acc + p.value, 0) || 1);

    // Wavelet Packet Decomposition (WPD) 8 Sub-Bands (0-500 Hz split)
    const wpdBands: WpdBand[] = [
      { band: 'WPD-1', range: '0-62.5 Hz (Sub/1X)', energy: scenario === 'MISFIRE' || scenario === 'PISTON_SLAP' ? 84 : 45, isDominant: scenario === 'MISFIRE' || scenario === 'PISTON_SLAP' },
      { band: 'WPD-2', range: '62.5-125 Hz (1X-2X)', energy: scenario === 'ROLLING_ELEMENT_DEFECT' ? 78 : 55, isDominant: scenario === 'ROLLING_ELEMENT_DEFECT' },
      { band: 'WPD-3', range: '125-187.5 Hz (BPFO)', energy: scenario.includes('BEARING') ? 92 : 28, isDominant: scenario.includes('BEARING') },
      { band: 'WPD-4', range: '187.5-250 Hz (3X-4X)', energy: scenario === 'VALVE_LASH' ? 88 : 22, isDominant: scenario === 'VALVE_LASH' },
      { band: 'WPD-5', range: '250-312.5 Hz', energy: scenario === 'SEVERE_BEARING_WEAR' ? 65 : 15, isDominant: false },
      { band: 'WPD-6', range: '312.5-375 Hz', energy: scenario === 'LUBRICATION_ISSUE' ? 72 : 12, isDominant: scenario === 'LUBRICATION_ISSUE' },
      { band: 'WPD-7', range: '375-437.5 Hz', energy: scenario === 'LUBRICATION_ISSUE' ? 68 : 10, isDominant: false },
      { band: 'WPD-8', range: '437.5-500 Hz (HF Noise)', energy: scenario === 'SEVERE_BEARING_WEAR' || scenario === 'OVERHEATING' ? 74 : 8, isDominant: scenario === 'OVERHEATING' },
    ];

    // Short-Time Fourier Transform (STFT) Spectrogram Time-Frequency bins
    const spectrogram: SpectrogramBin[] = [
      { timeBin: 'T-4.0s', f0_60Hz: 85, f1_120Hz: 30, f2_150Hz_BPFO: scenario.includes('BEARING') ? 60 : 10, f3_240Hz: 15, f4_360Hz: 8, f5_HighFreq: 12 },
      { timeBin: 'T-3.0s', f0_60Hz: 88, f1_120Hz: 32, f2_150Hz_BPFO: scenario.includes('BEARING') ? 65 : 10, f3_240Hz: 18, f4_360Hz: 9, f5_HighFreq: 14 },
      { timeBin: 'T-2.0s', f0_60Hz: 86, f1_120Hz: 31, f2_150Hz_BPFO: scenario.includes('BEARING') ? 72 : 11, f3_240Hz: 16, f4_360Hz: 10, f5_HighFreq: 15 },
      { timeBin: 'T-1.0s', f0_60Hz: 90, f1_120Hz: 33, f2_150Hz_BPFO: scenario.includes('BEARING') ? 80 : 12, f3_240Hz: 20, f4_360Hz: 12, f5_HighFreq: 18 },
      { timeBin: 'CURRENT', f0_60Hz: 92, f1_120Hz: 34, f2_150Hz_BPFO: scenario.includes('BEARING') ? 88 : 12, f3_240Hz: scenario === 'VALVE_LASH' ? 72 : 22, f4_360Hz: 14, f5_HighFreq: scenario === 'SEVERE_BEARING_WEAR' || scenario === 'LUBRICATION_ISSUE' ? 75 : 18 },
    ];

    set({
      waveform: newWaveform,
      spectrum: newSpectrum,
      spectrogram,
      wpdBands,
      features: {
        rms,
        peakAmplitude: peak,
        crestFactor,
        kurtosis,
        skewness,
        highFreqEnergyRatio
      }
    });
  }
}));
