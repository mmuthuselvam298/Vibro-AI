/**
 * VIBRO-AI FUSION - Digital Signal Processing (DSP) Engine (SIH26054)
 * 
 * Genuine Signal Processing Pipeline:
 *   ACCELEROMETER SIGNAL (Time-Domain Waveform)
 *            ↓
 *     HANNING WINDOWING
 *            ↓
 *   RADIX-2 COOLEY-TUKEY FFT
 *            ↓
 *    FREQUENCY SPECTRUM (0 - 512 Hz)
 *            ↓
 *    FEATURE EXTRACTION (Time-Domain & Spectral Features)
 * 
 * No faked FFT results. Spectrum and features are derived strictly from the
 * physical/synthetic 512-sample accelerometer waveform buffer.
 */

export interface TimeDomainFeatures {
  rms: number;
  peak: number;
  peakToPeak: number;
  crestFactor: number;
  kurtosis: number;
  skewness: number;
  mean: number;
  stdDev: number;
}

export interface SpectralFeatures {
  dominantFrequency: number;
  spectralEnergy: number;
  harmonicEnergy1X: number; // ~60 Hz fundamental
  harmonicEnergy2X: number; // ~120 Hz
  harmonicEnergy4X: number; // ~240 Hz
  bpfoBandEnergy: number;   // 140-160 Hz (Bearing Outer Race)
  bsfBandEnergy: number;    // 75-85 Hz (Ball Spin)
  highFreqEnergyRatio: number; // >250 Hz friction/broadband
}

export interface SpectralPoint {
  frequency: number;
  magnitude: number;
  phase: number;
  label?: string;
}

export interface DspAnalysisResult {
  spectrum: SpectralPoint[];
  timeFeatures: TimeDomainFeatures;
  spectralFeatures: SpectralFeatures;
}

/**
 * Applies a Hanning (Hann) Window to eliminate spectral leakage.
 * w[n] = 0.5 * (1 - cos(2*pi*n / (N - 1)))
 */
export function applyHanningWindow(samples: number[]): number[] {
  const N = samples.length;
  const windowed = new Float64Array(N);
  const factor = (2 * Math.PI) / (N - 1);

  for (let n = 0; n < N; n++) {
    const w = 0.5 * (1 - Math.cos(n * factor));
    windowed[n] = samples[n] * w;
  }

  return Array.from(windowed);
}

/**
 * Radix-2 Decimation-In-Time (DIT) Cooley-Tukey Fast Fourier Transform (FFT).
 * Expects array length to be a power of 2 (e.g. 512).
 * 
 * Returns complex output { real, imag }.
 */
export function radix2FFT(
  realInput: number[],
  imagInput?: number[]
): { real: Float64Array; imag: Float64Array } {
  const N = realInput.length;
  if ((N & (N - 1)) !== 0) {
    throw new Error(`FFT input size must be a power of 2, received: ${N}`);
  }

  const real = new Float64Array(realInput);
  const imag = imagInput ? new Float64Array(imagInput) : new Float64Array(N);

  // 1. Bit-reversal Permutation
  let j = 0;
  for (let i = 0; i < N - 1; i++) {
    if (i < j) {
      const tempR = real[i];
      real[i] = real[j];
      real[j] = tempR;

      const tempI = imag[i];
      imag[i] = imag[j];
      imag[j] = tempI;
    }
    let k = N >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // 2. Cooley-Tukey Butterfly Computations
  for (let len = 2; len <= N; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < N; i += len) {
      let wR = 1.0;
      let wI = 0.0;

      for (let k = 0; k < halfLen; k++) {
        const uR = real[i + k];
        const uI = imag[i + k];

        const vR = real[i + k + halfLen] * wR - imag[i + k + halfLen] * wI;
        const vI = real[i + k + halfLen] * wI + imag[i + k + halfLen] * wR;

        real[i + k] = uR + vR;
        imag[i + k] = uI + vI;

        real[i + k + halfLen] = uR - vR;
        imag[i + k + halfLen] = uI - vI;

        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }

  return { real, imag };
}

/**
 * Computes time-domain statistical moments and features from raw waveform samples.
 */
export function extractTimeDomainFeatures(samples: number[]): TimeDomainFeatures {
  const N = samples.length;
  if (N === 0) {
    return { rms: 0, peak: 0, peakToPeak: 0, crestFactor: 1, kurtosis: 3, skewness: 0, mean: 0, stdDev: 0 };
  }

  let sum = 0;
  let min = samples[0];
  let max = samples[0];
  let sumSquares = 0;

  for (let i = 0; i < N; i++) {
    const val = samples[i];
    sum += val;
    sumSquares += val * val;
    if (val < min) min = val;
    if (val > max) max = val;
  }

  const mean = sum / N;
  const rms = Math.sqrt(sumSquares / N);
  const peak = Math.max(Math.abs(min), Math.abs(max));
  const peakToPeak = max - min;
  const crestFactor = peak / (rms || 0.0001);

  // Central statistical moments: variance, skewness, kurtosis
  let sumDiff2 = 0;
  let sumDiff3 = 0;
  let sumDiff4 = 0;

  for (let i = 0; i < N; i++) {
    const diff = samples[i] - mean;
    const diff2 = diff * diff;
    sumDiff2 += diff2;
    sumDiff3 += diff2 * diff;
    sumDiff4 += diff2 * diff2;
  }

  const variance = sumDiff2 / N;
  const stdDev = Math.sqrt(variance);

  const skewness = stdDev > 0.0001 ? (sumDiff3 / N) / Math.pow(stdDev, 3) : 0;
  const kurtosis = variance > 0.0001 ? (sumDiff4 / N) / Math.pow(variance, 2) : 3.0;

  return {
    rms: Number(rms.toFixed(3)),
    peak: Number(peak.toFixed(3)),
    peakToPeak: Number(peakToPeak.toFixed(3)),
    crestFactor: Number(crestFactor.toFixed(2)),
    kurtosis: Number(kurtosis.toFixed(2)),
    skewness: Number(skewness.toFixed(2)),
    mean: Number(mean.toFixed(3)),
    stdDev: Number(stdDev.toFixed(3)),
  };
}

/**
 * Complete signal processing pipeline:
 * Takes N=512 time-domain samples sampled at fs=1024 Hz, windows them,
 * performs Radix-2 FFT, extracts spectral bins and statistical features.
 */
export function processSignalBuffer(
  samples: number[],
  samplingRate: number = 1024,
  nominalShaftRpm: number = 3600
): DspAnalysisResult {
  const N = 512;
  let buffer = samples.slice(0, N);

  // Pad with zeros if less than 512
  if (buffer.length < N) {
    const pad = new Array(N - buffer.length).fill(0);
    buffer = buffer.concat(pad);
  }

  // 1. Time-Domain Feature Extraction
  const timeFeatures = extractTimeDomainFeatures(buffer);

  // 2. Windowing
  const windowed = applyHanningWindow(buffer);

  // 3. Cooley-Tukey Radix-2 FFT
  const { real, imag } = radix2FFT(windowed);

  // 4. Compute Single-Sided Magnitude Spectrum (bins 0 to N/2)
  const numBins = N / 2; // 256 bins up to Nyquist (512 Hz)
  const df = samplingRate / N; // 1024 / 512 = 2.0 Hz resolution

  const shaftFreq1X = (nominalShaftRpm / 60); // 60 Hz at 3600 RPM
  const bpfoFreq = shaftFreq1X * 2.5; // ~150 Hz
  const bsfFreq = shaftFreq1X * 1.33;  // ~80 Hz

  const spectrum: SpectralPoint[] = [];
  let maxMag = 0;
  let dominantFreq = 0;
  let spectralEnergy = 0;

  let harmonicEnergy1X = 0;
  let harmonicEnergy2X = 0;
  let harmonicEnergy4X = 0;
  let bpfoBandEnergy = 0;
  let bsfBandEnergy = 0;
  let highFreqEnergySum = 0;

  for (let k = 0; k < numBins; k++) {
    const freq = k * df;
    // Normalized single-sided amplitude: (2 / N) * sqrt(R^2 + I^2)
    // Scale factor of ~50 to map cleanly into visual engineering g-magnitude units
    const rawMag = (2.0 / N) * Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
    const magnitude = Number((rawMag * 55).toFixed(1));
    const phase = Math.atan2(imag[k], real[k]);

    spectralEnergy += magnitude * magnitude;

    // Detect dominant frequency (excluding DC bin 0)
    if (k > 0 && magnitude > maxMag) {
      maxMag = magnitude;
      dominantFreq = freq;
    }

    // Label critical aerospace kinematic harmonics
    let label: string | undefined = undefined;
    if (Math.abs(freq - shaftFreq1X) < df) {
      label = `1X (${Math.round(shaftFreq1X)}Hz)`;
      harmonicEnergy1X += magnitude;
    } else if (Math.abs(freq - (shaftFreq1X * 2)) < df) {
      label = '2X';
      harmonicEnergy2X += magnitude;
    } else if (Math.abs(freq - (shaftFreq1X * 4)) < df) {
      label = '4X Valve';
      harmonicEnergy4X += magnitude;
    } else if (Math.abs(freq - bpfoFreq) < (df * 1.5)) {
      label = 'BPFO';
      bpfoBandEnergy += magnitude;
    } else if (Math.abs(freq - bsfFreq) < (df * 1.5)) {
      label = 'BSF';
      bsfBandEnergy += magnitude;
    } else if (Math.abs(freq - (shaftFreq1X * 0.5)) < df) {
      label = '0.5X Sub';
    }

    if (freq > 250) {
      highFreqEnergySum += magnitude;
    }

    spectrum.push({
      frequency: freq,
      magnitude,
      phase: Number(phase.toFixed(2)),
      label,
    });
  }

  const totalSpectrumSum = spectrum.reduce((acc, p) => acc + p.magnitude, 0) || 1;
  const highFreqEnergyRatio = Number((highFreqEnergySum / totalSpectrumSum).toFixed(3));

  const spectralFeatures: SpectralFeatures = {
    dominantFrequency: dominantFreq,
    spectralEnergy: Number(spectralEnergy.toFixed(1)),
    harmonicEnergy1X: Number(harmonicEnergy1X.toFixed(1)),
    harmonicEnergy2X: Number(harmonicEnergy2X.toFixed(1)),
    harmonicEnergy4X: Number(harmonicEnergy4X.toFixed(1)),
    bpfoBandEnergy: Number(bpfoBandEnergy.toFixed(1)),
    bsfBandEnergy: Number(bsfBandEnergy.toFixed(1)),
    highFreqEnergyRatio,
  };

  return {
    spectrum,
    timeFeatures,
    spectralFeatures,
  };
}
