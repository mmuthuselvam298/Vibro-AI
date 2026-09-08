"""
Vibration Signal & Feature Dataset Generator for Fault Classification

Generates reproducible synthetic vibration bursts across 6 target classes:
1. HEALTHY
2. BEARING_OUTER_RACE
3. BEARING_INNER_RACE
4. ROLLING_ELEMENT_DEFECT
5. PISTON_SLAP
6. VALVE_LASH

Pipelines each raw continuous-time vibration signal directly through the authoritative
backend DSP engine (vibration_service) to extract exact time-domain, spectral,
order, and sub-band features.
"""

import os
import sys
import json
import math
import random
from typing import List, Dict, Any, Tuple

# Ensure backend app is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.vibration_service import (
    compute_magnitude_spectrum,
    extract_time_domain_features,
    extract_spectral_and_order_features,
    compute_frequency_band_energies,
)

SAMPLE_RATE_HZ = 1024
NUM_SAMPLES = 512
DATASET_VERSION = "1.0.0"

CLASSES = [
    "HEALTHY",
    "BEARING_OUTER_RACE",
    "BEARING_INNER_RACE",
    "ROLLING_ELEMENT_DEFECT",
    "PISTON_SLAP",
    "VALVE_LASH",
]

def synthesize_signal(
    fault_type: str,
    rpm: float,
    seed: int,
    noise_level: float = 0.3,
    severity: float = 1.0,
) -> List[float]:
    """
    Synthesizes a 512-point continuous vibration waveform sampled at 1024 Hz
    based on kinematic physics and fault impact dynamics.
    """
    rng = random.Random(seed)
    f0 = rpm / 60.0  # fundamental shaft rotational frequency (Hz)
    samples = [0.0] * NUM_SAMPLES
    dt = 1.0 / SAMPLE_RATE_HZ

    # Random initial phase offsets to prevent phase leakage
    phi1 = rng.uniform(0, 2 * math.pi)
    phi2 = rng.uniform(0, 2 * math.pi)
    phi3 = rng.uniform(0, 2 * math.pi)

    for i in range(NUM_SAMPLES):
        t = i * dt
        # 1. Baseline shaft rotation harmonics (1X, 2X, 3X)
        val = 1.0 * math.sin(2 * math.pi * f0 * t + phi1)
        val += 0.35 * math.sin(2 * math.pi * (2 * f0) * t + phi2)
        val += 0.15 * math.sin(2 * math.pi * (3 * f0) * t + phi3)
        # Background stochastic mechanical noise
        val += (rng.uniform(-0.5, 0.5)) * noise_level

        # 2. Kinematic fault features injected into waveform
        if fault_type == "HEALTHY":
            pass

        elif fault_type == "BEARING_OUTER_RACE":
            # BPFO ~ 2.5 * f0 (e.g. 150 Hz at 3600 RPM)
            bpfo = 2.5 * f0
            impact_phase = (t % (1.0 / bpfo)) * bpfo
            # Exponential decay ringing at structural resonant frequency (~1200 Hz)
            decay = math.exp(-40.0 * impact_phase)
            ring = math.sin(2 * math.pi * 1200.0 * t)
            val += decay * ring * (1.8 * severity)
            val += rng.uniform(-0.2, 0.2) * severity

        elif fault_type == "BEARING_INNER_RACE":
            # BPFI ~ 3.5 * f0 (e.g. 210 Hz at 3600 RPM)
            bpfi = 3.5 * f0
            impact_phase = (t % (1.0 / bpfi)) * bpfi
            # Inner race passes load zone modulated by shaft rotation f0
            load_mod = 0.6 + 0.4 * math.cos(2 * math.pi * f0 * t)
            decay = math.exp(-35.0 * impact_phase)
            ring = math.sin(2 * math.pi * 1400.0 * t)
            val += decay * ring * load_mod * (2.0 * severity)

        elif fault_type == "ROLLING_ELEMENT_DEFECT":
            # BSF ~ 1.333 * f0 (e.g. 80 Hz), cage modulation FTF ~ 0.4 * f0 (24 Hz)
            bsf = 1.333 * f0
            ftf = 0.4 * f0
            mod = 0.5 + 0.5 * math.sin(2 * math.pi * ftf * t)
            impact = (math.sin(2 * math.pi * bsf * t) ** 14) * (3.0 * severity) * mod
            val += impact

        elif fault_type == "PISTON_SLAP":
            # Lateral thrust reversals at 0.5X engine speed (30 Hz at 3600 RPM)
            piston_freq = 0.5 * f0
            phase = t % (1.0 / piston_freq)
            if phase < 0.007:
                val += rng.uniform(-1.0, 1.0) * (5.5 * severity)
            val += 0.4 * math.sin(2 * math.pi * piston_freq * t)

        elif fault_type == "VALVE_LASH":
            # Camshaft speed 0.5X (30 Hz) + 4X valve train harmonic (240 Hz)
            valve_freq = 0.5 * f0
            val += (math.sin(2 * math.pi * valve_freq * t) ** 18) * (2.8 * severity)
            val += 0.8 * math.sin(2 * math.pi * (4.0 * f0) * t) * severity

        samples[i] = val

    return samples


def extract_features_from_samples(samples: List[float], rpm: float) -> Dict[str, float]:
    """
    Executes authoritative backend DSP pipeline on raw vibration signal.
    """
    time_feat = extract_time_domain_features(samples)
    spectrum, df = compute_magnitude_spectrum(samples, sampling_rate_hz=SAMPLE_RATE_HZ)
    spectral_feat = extract_spectral_and_order_features(spectrum, df, rpm=rpm)
    band_list, _ = compute_frequency_band_energies(spectrum, sampling_rate_hz=SAMPLE_RATE_HZ)
    band_dict = {f"band_{i+1}_energy": float(b["energy"]) for i, b in enumerate(band_list)}

    features: Dict[str, float] = {
        "rms": float(time_feat["rms"]),
        "peak": float(time_feat["peak"]),
        "peak_to_peak": float(time_feat["peak_to_peak"]),
        "crest_factor": float(time_feat["crest_factor"]),
        "kurtosis": float(time_feat["kurtosis"]),
        "skewness": float(time_feat["skewness"]),
        "mean": float(time_feat["mean"]),
        "std_dev": float(time_feat["std_dev"]),
        "dominant_frequency": float(spectral_feat["dominant_frequency"]),
        "spectral_energy": float(spectral_feat["spectral_energy"]),
        "harmonic_energy_1x": float(spectral_feat["harmonic_energy_1x"]),
        "harmonic_energy_2x": float(spectral_feat["harmonic_energy_2x"]),
        "harmonic_energy_4x": float(spectral_feat["harmonic_energy_4x"]),
        "bpfo_band_energy": float(spectral_feat["bpfo_band_energy"]),
        "bsf_band_energy": float(spectral_feat["bsf_band_energy"]),
        "high_freq_energy_ratio": float(spectral_feat["high_freq_energy_ratio"]),
        "band_1_energy": band_dict.get("band_1_energy", 0.0),
        "band_2_energy": band_dict.get("band_2_energy", 0.0),
        "band_3_energy": band_dict.get("band_3_energy", 0.0),
        "band_4_energy": band_dict.get("band_4_energy", 0.0),
        "band_5_energy": band_dict.get("band_5_energy", 0.0),
        "band_6_energy": band_dict.get("band_6_energy", 0.0),
        "band_7_energy": band_dict.get("band_7_energy", 0.0),
        "band_8_energy": band_dict.get("band_8_energy", 0.0),
    }
    return features


def generate_full_dataset(
    samples_per_class: int = 150,
    base_seed: int = 42,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Generates balanced multi-class dataset across various operating conditions
    (varying RPM, severity, noise level) to prevent data leakage.
    """
    records = []
    metadata = {
        "version": DATASET_VERSION,
        "classes": CLASSES,
        "samples_per_class": samples_per_class,
        "total_samples": samples_per_class * len(CLASSES),
        "sampling_rate_hz": SAMPLE_RATE_HZ,
        "window_size": NUM_SAMPLES,
        "features": list(extract_features_from_samples([0.0]*NUM_SAMPLES, 3600.0).keys()),
    }

    sample_id = 0
    for class_idx, class_name in enumerate(CLASSES):
        for i in range(samples_per_class):
            sample_id += 1
            # Distinct seed for each sample
            seed = base_seed + (class_idx * 10000) + i
            rng = random.Random(seed)

            # Varied operating conditions: RPM 3200 - 3800
            rpm = rng.uniform(3300.0, 3700.0)
            noise_level = rng.uniform(0.20, 0.45)
            # Varied severity for faulty classes
            severity = rng.uniform(0.7, 1.4) if class_name != "HEALTHY" else 0.0

            # Group split assignment: 80% train family, 20% test family
            split_group = "test" if (i % 5 == 0) else "train"

            raw_signal = synthesize_signal(
                fault_type=class_name,
                rpm=rpm,
                seed=seed,
                noise_level=noise_level,
                severity=severity,
            )

            feat = extract_features_from_samples(raw_signal, rpm=rpm)

            records.append({
                "sample_id": sample_id,
                "label": class_name,
                "class_index": class_idx,
                "split_group": split_group,
                "operating_rpm": round(rpm, 1),
                "severity": round(severity, 2),
                "noise_level": round(noise_level, 2),
                "features": feat,
            })

    return records, metadata


def main():
    data_dir = os.path.join(backend_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    dataset_file = os.path.join(data_dir, "vibration_dataset.json")

    print(f"Generating synthetic vibration dataset (150 samples x 6 classes = 900 samples)...")
    records, metadata = generate_full_dataset(samples_per_class=150, base_seed=42)

    payload = {
        "metadata": metadata,
        "data": records,
    }

    with open(dataset_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"Dataset successfully written to: {dataset_file}")
    print(f"Total samples: {len(records)}, Features per sample: {len(metadata['features'])}")


if __name__ == "__main__":
    main()
