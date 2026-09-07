import { create } from 'zustand';
import type { ScenarioType } from './engineStore';
import { processSignalBuffer, type DspAnalysisResult, type TimeDomainFeatures, type SpectralFeatures } from '@/lib/dspEngine';

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
  dominantFrequency: number;
}

interface SignalState {
  waveform: DataPoint[];
  spectrum: DataPoint[];
  spectrogram: SpectrogramBin[];
  wpdBands: WpdBand[];
  features: FeatureMetrics;
  timeFeatures: TimeDomainFeatures;
  spectralFeatures: SpectralFeatures;

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
    highFreqEnergyRatio: 0.08,
    dominantFrequency: 60,
  },
  timeFeatures: {
    rms: 0.85,
    peak: 1.25,
    peakToPeak: 2.45,
    crestFactor: 1.47,
    kurtosis: 3.02,
    skewness: 0.05,
    mean: 0.0,
    stdDev: 0.85,
  },
  spectralFeatures: {
    dominantFrequency: 60,
    spectralEnergy: 1240,
    harmonicEnergy1X: 92,
    harmonicEnergy2X: 34,
    harmonicEnergy4X: 16,
    bpfoBandEnergy: 8,
    bsfBandEnergy: 6,
    highFreqEnergyRatio: 0.08,
  },

  generateSignal: (scenario: ScenarioType, timeOffset: number) => {
    // 512 samples at 1024 Hz sampling rate (Radix-2 FFT power-of-2 length)
    const SAMPLE_RATE = 1024;
    const NUM_SAMPLES = 512;

    const rawSamples: number[] = new Array(NUM_SAMPLES);
    const newWaveform: DataPoint[] = new Array(NUM_SAMPLES);

    // Fundamental shaft speed (60 Hz at 3,600 RPM)
    const f0 = 60;

    for (let i = 0; i < NUM_SAMPLES; i++) {
      const t = (i / SAMPLE_RATE) + timeOffset;
      let val = 0;

      // 1. Shaft rotation baseline harmonics (1X, 2X, 3X) + sensor noise
      val += 1.0 * Math.sin(2 * Math.PI * f0 * t);
      val += 0.35 * Math.sin(2 * Math.PI * (2 * f0) * t + 0.5);
      val += 0.15 * Math.sin(2 * Math.PI * (3 * f0) * t + 1.2);
      val += (Math.random() - 0.5) * 0.32; // Gaussian baseline noise

      // 2. Physical fault kinematics injected into continuous time domain waveform
      switch (scenario) {
        case 'EARLY_BEARING_WEAR': {
          // BPFO impacts (~150 Hz) with 1.2 kHz resonant ringing decay
          const bpfo = 150;
          const impactPhase = (t % (1 / bpfo)) * bpfo;
          const impact = Math.exp(-45 * impactPhase) * Math.sin(2 * Math.PI * 1200 * t) * 1.8;
          val += impact;
          val += (Math.random() - 0.5) * 0.4;
          break;
        }
        case 'SEVERE_BEARING_WEAR': {
          // Heavy periodic spall impacts + 2X/3X harmonics + broadband contact noise
          const bpfo = 150;
          const impactPhase = (t % (1 / bpfo)) * bpfo;
          const impact = Math.exp(-22 * impactPhase) * Math.sin(2 * Math.PI * 1200 * t) * 4.2;
          val += impact;
          val += 0.9 * Math.sin(2 * Math.PI * 300 * t);
          val += 0.5 * Math.sin(2 * Math.PI * 450 * t);
          val += (Math.random() - 0.5) * 1.2;
          break;
        }
        case 'PISTON_SLAP': {
          // Transient 30 Hz impact burst (TDC & BDC lateral thrust reversals)
          const pistonFreq = 30;
          const phase = t % (1 / pistonFreq);
          if (phase < 0.006) {
            val += (Math.random() - 0.5) * 6.5;
          }
          break;
        }
        case 'VALVE_LASH': {
          // Valve seating impacts (30 Hz) + 4X valve train harmonic growth (240 Hz)
          const valveFreq = 30;
          const impact = Math.pow(Math.sin(2 * Math.PI * valveFreq * t), 18) * 2.8;
          val += impact;
          val += 0.85 * Math.sin(2 * Math.PI * 240 * t);
          break;
        }
        case 'ROLLING_ELEMENT_DEFECT': {
          // Ball Spin Frequency BSF (~80 Hz) amplitude-modulated by cage train FTF (~24 Hz)
          const bsf = 80;
          const ftf = 24;
          const modulation = 0.5 + 0.5 * Math.sin(2 * Math.PI * ftf * t);
          const impact = Math.pow(Math.sin(2 * Math.PI * bsf * t), 14) * 3.4 * modulation;
          val += impact;
          break;
        }
        case 'MISFIRE': {
          // 0.5X sub-harmonic (30 Hz) torque deficit + cyclic combustion dip
          val += 1.8 * Math.sin(2 * Math.PI * 30 * t);
          val += (Math.random() - 0.5) * 1.0;
          break;
        }
        case 'INJECTOR_ABNORMALITY': {
          // Non-uniform combustion cylinder pressure spike (60 Hz phase shifted)
          val += 1.1 * Math.sin(2 * Math.PI * 60 * t + 1.8);
          val += (Math.random() - 0.5) * 0.9;
          break;
        }
        case 'LUBRICATION_ISSUE': {
          // High-frequency boundary friction chatter & metal-to-metal rubbing
          val += 0.8 * Math.sin(2 * Math.PI * 380 * t);
          val += (Math.random() - 0.5) * 2.2;
          break;
        }
        case 'OVERHEATING': {
          // Thermal expansion clearance reduction + low-frequency resonance
          val += 0.9 * Math.sin(2 * Math.PI * 45 * t);
          val += 0.5 * Math.sin(2 * Math.PI * 240 * t);
          val += (Math.random() - 0.5) * 1.5;
          break;
        }
        case 'SENSOR_DRIFT': {
          // Stationary DC bias offset (+1.1g) on standard baseline waveform
          val += 1.1;
          break;
        }
        case 'COMBUSTION_INSTABILITY': {
          // Acoustic flame front oscillations + knock bursts
          val += 1.4 * Math.sin(2 * Math.PI * 4.5 * t) * Math.sin(2 * Math.PI * 60 * t);
          val += (Math.random() - 0.5) * 1.4;
          break;
        }
        default:
          break;
      }

      rawSamples[i] = val;
      newWaveform[i] = { time: Number(t.toFixed(4)), value: Number(val.toFixed(3)) };
    }

    // 3. RUN REAL DSP PIPELINE: Hanning Window + Radix-2 FFT + Statistical Extraction
    const dspResult: DspAnalysisResult = processSignalBuffer(rawSamples, SAMPLE_RATE, 3600);

    // Map spectrum points to DataPoint format (downsampling slightly for smooth rendering)
    const newSpectrum: DataPoint[] = dspResult.spectrum.map((p) => ({
      time: p.frequency,
      value: p.magnitude,
      label: p.label,
    }));

    // 4. Wavelet Packet Decomposition (WPD) Sub-Bands (0 - 512 Hz partitioned into 8 bands)
    const bandSize = 64; // 64 Hz per band across 8 bands
    const wpdBands: WpdBand[] = [];
    let maxBandEnergy = 0;
    let dominantBandIdx = 0;

    for (let b = 0; b < 8; b++) {
      const startF = b * bandSize;
      const endF = (b + 1) * bandSize;
      const bandPoints = dspResult.spectrum.filter((p) => p.frequency >= startF && p.frequency < endF);
      const bandEnergy = bandPoints.reduce((acc, p) => acc + (p.magnitude * p.magnitude), 0);
      const normalizedEnergy = Number(Math.min(100, Math.sqrt(bandEnergy) / 2.5).toFixed(1));

      if (normalizedEnergy > maxBandEnergy) {
        maxBandEnergy = normalizedEnergy;
        dominantBandIdx = b;
      }

      const bandDescriptions = [
        '0-64 Hz (Sub/1X)',
        '64-128 Hz (1X-2X)',
        '128-192 Hz (BPFO)',
        '192-256 Hz (3X-4X)',
        '256-320 Hz (Bearing Harmonics)',
        '320-384 Hz (Friction/Resonance)',
        '384-448 Hz (High-Frequency)',
        '448-512 Hz (Nyquist Band)',
      ];

      wpdBands.push({
        band: `WPD-${b + 1}`,
        range: bandDescriptions[b],
        energy: normalizedEnergy,
        isDominant: false,
      });
    }
    if (wpdBands[dominantBandIdx]) {
      wpdBands[dominantBandIdx].isDominant = true;
    }

    // 5. Build Spectrogram Time Bins (Rolling waterfall cache)
    const newSpectrogram: SpectrogramBin[] = [
      {
        timeBin: 'T-0.8s',
        f0_60Hz: dspResult.spectralFeatures.harmonicEnergy1X * 0.95,
        f1_120Hz: dspResult.spectralFeatures.harmonicEnergy2X * 0.95,
        f2_150Hz_BPFO: dspResult.spectralFeatures.bpfoBandEnergy * 0.95,
        f3_240Hz: dspResult.spectralFeatures.harmonicEnergy4X * 0.95,
        f4_360Hz: 12,
        f5_HighFreq: dspResult.spectralFeatures.highFreqEnergyRatio * 100,
      },
      {
        timeBin: 'T-0.4s',
        f0_60Hz: dspResult.spectralFeatures.harmonicEnergy1X * 0.98,
        f1_120Hz: dspResult.spectralFeatures.harmonicEnergy2X * 0.98,
        f2_150Hz_BPFO: dspResult.spectralFeatures.bpfoBandEnergy * 0.98,
        f3_240Hz: dspResult.spectralFeatures.harmonicEnergy4X * 0.98,
        f4_360Hz: 14,
        f5_HighFreq: dspResult.spectralFeatures.highFreqEnergyRatio * 100,
      },
      {
        timeBin: 'NOW',
        f0_60Hz: dspResult.spectralFeatures.harmonicEnergy1X,
        f1_120Hz: dspResult.spectralFeatures.harmonicEnergy2X,
        f2_150Hz_BPFO: dspResult.spectralFeatures.bpfoBandEnergy,
        f3_240Hz: dspResult.spectralFeatures.harmonicEnergy4X,
        f4_360Hz: 15,
        f5_HighFreq: dspResult.spectralFeatures.highFreqEnergyRatio * 100,
      },
    ];

    set({
      waveform: newWaveform,
      spectrum: newSpectrum,
      spectrogram: newSpectrogram,
      wpdBands,
      timeFeatures: dspResult.timeFeatures,
      spectralFeatures: dspResult.spectralFeatures,
      features: {
        rms: dspResult.timeFeatures.rms,
        peakAmplitude: dspResult.timeFeatures.peak,
        crestFactor: dspResult.timeFeatures.crestFactor,
        kurtosis: dspResult.timeFeatures.kurtosis,
        skewness: dspResult.timeFeatures.skewness,
        highFreqEnergyRatio: dspResult.spectralFeatures.highFreqEnergyRatio,
        dominantFrequency: dspResult.spectralFeatures.dominantFrequency,
      },
    });
  },
}));
