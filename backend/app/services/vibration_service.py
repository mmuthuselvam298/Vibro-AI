"""
Vibration Signal Processing & Feature Extraction Service

RESEARCH / PROTOTYPE NOTICE:
-----------------------------
1. This service provides deterministic signal-processing routines (Hann windowing,
   Radix-2 FFT, time-domain moment extraction, spectral band integration, and 8-band
   spectral sub-band energy decomposition) for research and decision-support demonstration.
2. It does NOT claim flight-validated vibration models or flight clearance authority.
3. It does NOT use a trained neural network or claim guaranteed diagnostic accuracy.
4. Characteristic bearing bands and harmonic indicators represent candidate kinematic
   evidence and configurable prototype assumptions. They require corroboration with
   bearing-specific geometry, oil temperature/pressure, CHT/EGT, and physical inspection.
"""

import math
import cmath
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


# =====================================================================
# Configurable Prototype Kinematic & Bearing Assumptions
# =====================================================================

@dataclass(frozen=True)
class PrototypeBearingFrequencyConfig:
    """
    Configurable prototype multipliers for candidate bearing defect bands.

    IMPORTANT RESEARCH NOTICE:
    Actual bearing characteristic frequencies (BPFO, BPFI, BSF, FTF) strictly depend
    on physical bearing geometry (pitch diameter, roller diameter, contact angle,
    number of rolling elements). These multipliers represent configurable prototype
    assumptions for decision-support demonstration, NOT universally measured, validated,
    or OEM-calibrated bearing defect frequencies.
    """
    bpfo_candidate_multiplier: float = 2.5     # Illustrative candidate outer-race factor (~150 Hz @ 3600 RPM)
    bsf_candidate_multiplier: float = 1.333    # Illustrative candidate ball-spin factor (~80 Hz @ 3600 RPM)
    search_bandwidth_tolerance_factor: float = 1.5  # Spectral search tolerance factor


DEFAULT_BEARING_FREQUENCY_CONFIG = PrototypeBearingFrequencyConfig()


# =====================================================================
# Windowing & Preprocessing
# =====================================================================

def remove_dc_bias(samples: List[float]) -> List[float]:
    """Removes stationary DC bias (mean subtraction)."""
    if not samples:
        return []
    mean_val = sum(samples) / len(samples)
    return [x - mean_val for x in samples]


def apply_hann_window(samples: List[float]) -> List[float]:
    """
    Applies a Hann window to eliminate spectral leakage.
    w[n] = 0.5 * (1 - cos(2 * pi * n / (N - 1)))
    """
    n = len(samples)
    if n <= 1:
        return list(samples)
    factor = (2.0 * math.pi) / (n - 1)
    return [samples[i] * (0.5 * (1.0 - math.cos(i * factor))) for i in range(n)]


# Backward-compatible alias
apply_hanning_window = apply_hann_window


def pad_to_power_of_two(samples: List[float], min_size: int = 512) -> List[float]:
    """
    Pads or truncates a signal array to the nearest power-of-two length
    for Cooley-Tukey Radix-2 FFT compatibility.
    """
    n = len(samples)
    if n == 0:
        return [0.0] * min_size

    # Find next power of 2 >= n and >= min_size
    target = max(min_size, 1 << (n - 1).bit_length())
    if len(samples) == target:
        return list(samples)
    if len(samples) < target:
        return list(samples) + [0.0] * (target - len(samples))
    return samples[:target]


# =====================================================================
# Radix-2 Cooley-Tukey Fast Fourier Transform
# =====================================================================

def radix2_fft(x: List[complex]) -> List[complex]:
    """
    Computes Radix-2 Decimation-in-Time Cooley-Tukey FFT.
    Length of input list x MUST be a power of 2.
    """
    n = len(x)
    if n <= 1:
        return x
    if (n & (n - 1)) != 0:
        raise ValueError(f"FFT input size must be a power of 2, received: {n}")

    even = radix2_fft(x[0::2])
    odd = radix2_fft(x[1::2])

    factor = -2j * math.pi / n
    t_arr = [cmath.exp(factor * k) * odd[k] for k in range(n // 2)]

    return [even[k] + t_arr[k] for k in range(n // 2)] + [even[k] - t_arr[k] for k in range(n // 2)]


def compute_magnitude_spectrum(
    samples: List[float],
    sampling_rate_hz: int = 1024,
    scale_factor: float = 55.0,
) -> Tuple[List[Dict[str, Any]], float]:
    """
    Computes single-sided magnitude spectrum up to Nyquist frequency (fs / 2).
    Returns spectrum points list [{'frequency': f, 'magnitude': mag, 'phase': p}]
    and frequency resolution df.
    """
    n = len(samples)
    if (n & (n - 1)) != 0:
        samples = pad_to_power_of_two(samples, 512)
        n = len(samples)

    complex_input = [complex(s, 0.0) for s in samples]
    fft_out = radix2_fft(complex_input)

    num_bins = n // 2
    df = float(sampling_rate_hz) / float(n)

    spectrum = []
    for k in range(num_bins):
        freq = round(k * df, 2)
        # Normalized single-sided amplitude: (2.0 / N) * |X[k]|
        raw_mag = (2.0 / n) * abs(fft_out[k])
        # Scale to visual engineering units matching frontend DSP engine
        mag = round(raw_mag * scale_factor, 2)
        phase = round(cmath.phase(fft_out[k]), 2)
        spectrum.append({
            "frequency": freq,
            "magnitude": mag,
            "phase": phase,
        })

    return spectrum, df


# =====================================================================
# Time-Domain Feature Extraction
# =====================================================================

def extract_time_domain_features(samples: List[float]) -> Dict[str, float]:
    """
    Computes statistical moments and envelope metrics from time-domain acceleration samples.
    """
    n = len(samples)
    if n == 0:
        return {
            "rms": 0.0,
            "peak": 0.0,
            "peak_to_peak": 0.0,
            "crest_factor": 1.0,
            "kurtosis": 3.0,
            "skewness": 0.0,
            "mean": 0.0,
            "std_dev": 0.0,
        }

    sum_val = sum(samples)
    sum_sq = sum(x * x for x in samples)
    min_val = min(samples)
    max_val = max(samples)

    mean = sum_val / n
    rms = math.sqrt(max(0.0, sum_sq / n))
    peak = max(abs(min_val), abs(max_val))
    peak_to_peak = max_val - min_val
    crest_factor = peak / (rms if rms > 1e-6 else 1e-6)

    # Moments around the mean
    sum_diff2 = 0.0
    sum_diff3 = 0.0
    sum_diff4 = 0.0
    for x in samples:
        diff = x - mean
        d2 = diff * diff
        sum_diff2 += d2
        sum_diff3 += d2 * diff
        sum_diff4 += d2 * d2

    variance = sum_diff2 / n
    std_dev = math.sqrt(max(0.0, variance))

    skewness = (sum_diff3 / n) / (std_dev ** 3) if std_dev > 1e-5 else 0.0
    kurtosis = (sum_diff4 / n) / (variance ** 2) if variance > 1e-5 else 3.0

    return {
        "rms": round(rms, 3),
        "peak": round(peak, 3),
        "peak_to_peak": round(peak_to_peak, 3),
        "crest_factor": round(crest_factor, 2),
        "kurtosis": round(kurtosis, 2),
        "skewness": round(skewness, 2),
        "mean": round(mean, 3),
        "std_dev": round(std_dev, 3),
    }


# =====================================================================
# Spectral & Engine-Order Feature Extraction
# =====================================================================

def extract_spectral_and_order_features(
    spectrum: List[Dict[str, Any]],
    df: float,
    rpm: Optional[float] = None,
    bearing_config: PrototypeBearingFrequencyConfig = DEFAULT_BEARING_FREQUENCY_CONFIG,
) -> Dict[str, Any]:
    """
    Extracts spectral energy, dominant frequency peak, kinematic harmonic indicators,
    and engine-order normalized metrics.

    IMPORTANT:
    1. Rotational frequency assumption:
       f_shaft = RPM / 60.0 (e.g. 3600 RPM -> 60.0 Hz).
    2. Harmonics (1X, 2X, 4X) and bearing bands are illustrative prototype kinematic
       indicators, not definitive or universal fault diagnoses.
    """
    if not spectrum:
        return {
            "dominant_frequency": 0.0,
            "spectral_energy": 0.0,
            "harmonic_energy_1x": 0.0,
            "harmonic_energy_2x": 0.0,
            "harmonic_energy_4x": 0.0,
            "bpfo_band_energy": 0.0,
            "bsf_band_energy": 0.0,
            "high_freq_energy_ratio": 0.0,
            "dominant_order": None,
            "shaft_frequency_hz": None,
        }

    # Fundamental shaft rotational frequency from RPM
    shaft_freq_1x = (rpm / 60.0) if (rpm and rpm > 0) else 60.0  # 60 Hz nominal prototype baseline
    bpfo_candidate_freq = shaft_freq_1x * bearing_config.bpfo_candidate_multiplier
    bsf_candidate_freq = shaft_freq_1x * bearing_config.bsf_candidate_multiplier

    dominant_freq = 0.0
    max_mag = -1.0
    spectral_energy = 0.0

    harmonic_1x = 0.0
    harmonic_2x = 0.0
    harmonic_4x = 0.0
    bpfo_candidate_energy = 0.0
    bsf_candidate_energy = 0.0
    high_freq_energy = 0.0
    total_mag = 0.0

    for pt in spectrum:
        freq = pt["frequency"]
        mag = pt["magnitude"]
        total_mag += mag
        spectral_energy += mag * mag

        # Dominant peak detection (excluding DC at 0 Hz)
        if freq > 0.0 and mag > max_mag:
            max_mag = mag
            dominant_freq = freq

        # Harmonic bin integrations
        tol = max(df * 1.5, 3.0)
        if abs(freq - shaft_freq_1x) <= tol:
            harmonic_1x += mag
        elif abs(freq - (2.0 * shaft_freq_1x)) <= tol:
            harmonic_2x += mag
        elif abs(freq - (4.0 * shaft_freq_1x)) <= tol:
            harmonic_4x += mag
        elif abs(freq - bpfo_candidate_freq) <= tol * bearing_config.search_bandwidth_tolerance_factor:
            bpfo_candidate_energy += mag
        elif abs(freq - bsf_candidate_freq) <= tol * bearing_config.search_bandwidth_tolerance_factor:
            bsf_candidate_energy += mag

        if freq > 250.0:
            high_freq_energy += mag

    high_freq_ratio = (high_freq_energy / total_mag) if total_mag > 0 else 0.0
    dominant_order = (dominant_freq / shaft_freq_1x) if shaft_freq_1x > 0 else None

    return {
        "dominant_frequency": round(dominant_freq, 1),
        "dominant_magnitude": round(max_mag if max_mag >= 0 else 0.0, 1),
        "spectral_energy": round(spectral_energy, 1),
        "harmonic_energy_1x": round(harmonic_1x, 1),
        "harmonic_energy_2x": round(harmonic_2x, 1),
        "harmonic_energy_4x": round(harmonic_4x, 1),
        "bpfo_band_energy": round(bpfo_candidate_energy, 1),
        "bsf_band_energy": round(bsf_candidate_energy, 1),
        "high_freq_energy_ratio": round(high_freq_ratio, 3),
        "dominant_order": round(dominant_order, 2) if dominant_order is not None else None,
        "shaft_frequency_hz": round(shaft_freq_1x, 2) if rpm else None,
    }


# =====================================================================
# Spectral Sub-Band Energy Decomposition (8-Band Frequency Partition)
# =====================================================================

def compute_frequency_band_energies(
    spectrum: List[Dict[str, Any]],
    sampling_rate_hz: int = 1024,
    num_bands: int = 8,
) -> Tuple[List[Dict[str, Any]], str]:
    """
    Computes spectral sub-band energies by partitioning the FFT spectrum across
    8 uniform frequency bands (e.g. 64 Hz per band for 1024 Hz fs).

    NOTE:
    This algorithm performs uniform frequency-band spectral aggregation (not Wavelet
    Packet Decomposition). It isolates energy distribution across sub-rotational,
    fundamental, candidate kinematic, and high-frequency acoustic bands.
    """
    nyquist = sampling_rate_hz / 2.0
    band_width = nyquist / num_bands

    band_descriptions = [
        "0-64 Hz (Sub-rotational & fundamental band)",
        "64-128 Hz (Harmonic band 1X-2X)",
        "128-192 Hz (Candidate bearing outer-race band)",
        "192-256 Hz (Higher-order harmonic band 3X-4X)",
        "256-320 Hz (Mid-frequency spectral band)",
        "320-384 Hz (Structural acoustic / friction band)",
        "384-448 Hz (High-frequency broadband)",
        "448-512 Hz (Nyquist boundary band)",
    ]

    bands = []
    max_energy = -1.0
    dominant_label = "BAND-1"

    for b in range(num_bands):
        start_f = b * band_width
        end_f = (b + 1) * band_width
        pts = [p for p in spectrum if start_f <= p["frequency"] < end_f]
        raw_energy = sum(p["magnitude"] * p["magnitude"] for p in pts)
        normalized_energy = round(min(100.0, math.sqrt(raw_energy) / 2.5), 1)

        band_name = f"BAND-{b + 1}"
        range_desc = band_descriptions[b] if b < len(band_descriptions) else f"{int(start_f)}-{int(end_f)} Hz"

        if normalized_energy > max_energy:
            max_energy = normalized_energy
            dominant_label = band_name

        bands.append({
            "band": band_name,
            "range": range_desc,
            "energy": normalized_energy,
            "is_dominant": False,
        })

    for b_obj in bands:
        if b_obj["band"] == dominant_label:
            b_obj["is_dominant"] = True

    return bands, dominant_label


# Backward-compatible alias
compute_wpd_sub_bands = compute_frequency_band_energies


# =====================================================================
# Decision-Support Candidate Indicators (Requires Corroboration)
# =====================================================================

def evaluate_candidate_indicators(
    time_features: Dict[str, float],
    spectral_features: Dict[str, Any],
    dominant_subband: str,
) -> str:
    """
    Generates rule-based candidate mechanical indicators.

    IMPORTANT RESEARCH BOUNDARY:
    These are decision-support evidence markers, NOT confirmed diagnostic failures.
    They require corroboration with multi-sensor telemetry (CHT, EGT, oil pressure)
    and authorized technical inspection procedures.
    """
    kurtosis = time_features.get("kurtosis", 3.0)
    crest = time_features.get("crest_factor", 1.0)
    bpfo_energy = spectral_features.get("bpfo_band_energy", 0.0)
    harmonic_1x = max(1.0, spectral_features.get("harmonic_energy_1x", 1.0))
    harmonic_2x = spectral_features.get("harmonic_energy_2x", 0.0)
    harmonic_4x = spectral_features.get("harmonic_energy_4x", 0.0)
    high_freq_ratio = spectral_features.get("high_freq_energy_ratio", 0.0)

    if bpfo_energy > (1.8 * harmonic_1x) and dominant_subband in {"BAND-3", "WPD-3"}:
        return "CANDIDATE_OUTER_RACE_BAND_ELEVATION (candidate signature; requires corroboration)"
    if kurtosis > 4.8 and crest > 2.8:
        return "CANDIDATE_TRANSIENT_IMPACT_SIGNATURE (candidate signature; requires corroboration)"
    if harmonic_2x > (1.4 * harmonic_1x):
        return "CANDIDATE_2X_HARMONIC_ELEVATION (candidate signature; requires corroboration)"
    if harmonic_4x > (1.2 * harmonic_1x) and dominant_subband in {"BAND-4", "WPD-4"}:
        return "CANDIDATE_4X_HARMONIC_ELEVATION (candidate signature; requires corroboration)"
    if high_freq_ratio > 0.35:
        return "CANDIDATE_BROADBAND_HIGH_FREQ_ENERGY (candidate signature; requires corroboration)"

    return "NOMINAL_VIBRATION_BASELINE (candidate signature)"


# =====================================================================
# In-Memory Real-Time Vibration Cache (High-Resolution Buffer)
# =====================================================================

@dataclass
class CachedVibrationBurst:
    engine_id: int
    burst_id: int
    timestamp: str
    sampling_rate_hz: int
    axis: str
    rpm: Optional[float]
    time_features: Dict[str, float]
    spectral_features: Dict[str, Any]
    frequency_bands: List[Dict[str, Any]]
    spectrum_summary: List[Dict[str, Any]]
    candidate_indicator: str

    @property
    def wpd_bands(self) -> List[Dict[str, Any]]:
        """Deprecated compatibility property for frequency_bands."""
        return self.frequency_bands


class VibrationBufferService:
    """
    In-memory cache for the latest processed vibration burst per engine.
    Ensures sub-millisecond dashboard retrieval without storing massive
    frequency arrays in the SQLite database.
    """
    def __init__(self, max_spectrum_bins: int = 128):
        self._cache: Dict[int, CachedVibrationBurst] = {}
        self.max_spectrum_bins = max_spectrum_bins

    def set_latest(self, engine_id: int, burst: CachedVibrationBurst):
        self._cache[engine_id] = burst

    def get_latest(self, engine_id: int) -> Optional[CachedVibrationBurst]:
        return self._cache.get(engine_id)


vibration_buffer = VibrationBufferService()
