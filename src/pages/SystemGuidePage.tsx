import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Cpu,
  Activity,
  Layers,
  Zap,
  ShieldCheck,
  Compass,
  FileText,
  HelpCircle,
  Database,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const SystemGuidePage: React.FC = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('01-overview');
  const [glossarySearch, setGlossarySearch] = useState('');

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setActiveSection(id);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location]);

  const sections = [
    { id: '01-overview', title: '01 — Overview', icon: <BookOpen size={18} /> },
    { id: '02-problem-motivation', title: '02 — Problem & Motivation', icon: <HelpCircle size={18} /> },
    { id: '03-system-architecture', title: '03 — System Architecture', icon: <Layers size={18} /> },
    { id: '04-engine-sensors', title: '04 — Engine & Sensors', icon: <Activity size={18} /> },
    { id: '05-sensor-fusion', title: '05 — Sensor Fusion', icon: <Layers size={18} /> },
    { id: '06-signal-processing', title: '06 — Signal Processing (DSP)', icon: <Zap size={18} /> },
    { id: '07-ai-fault-diagnosis', title: '07 — AI Fault Diagnosis', icon: <Cpu size={18} /> },
    { id: '08-fault-signatures', title: '08 — Fault Signatures (BPFO/BSF)', icon: <Activity size={18} /> },
    { id: '09-severity-estimation', title: '09 — Severity Estimation', icon: <TrendingDown size={18} /> },
    { id: '10-rul', title: '10 — Remaining Useful Life (RUL)', icon: <ShieldCheck size={18} /> },
    { id: '11-digital-twin', title: '11 — Digital Twin Model', icon: <Cpu size={18} /> },
    { id: '12-edge-computing', title: '12 — Edge Computing (STM32/CM4)', icon: <Database size={18} /> },
    { id: '13-mission-simulation-replay', title: '13 — Mission Simulation & Replay', icon: <Compass size={18} /> },
    { id: '14-glossary', title: '14 — Searchable Technical Glossary', icon: <FileText size={18} /> },
  ];

  const glossaryItems = [
    { term: 'ADXL355', category: 'Hardware', definition: 'High-precision 3-axis MEMS accelerometer with ultra-low noise density (25 μg/√Hz) and 20-bit resolution used for high-frequency engine vibration acquisition.' },
    { term: 'BPFO', category: 'Vibration Physics', definition: 'Ball Pass Frequency Outer Race. Characteristic vibration defect frequency generated when bearing rollers pass over a surface flaw in the stationary outer race. Formula: BPFO = (N/2) * (RPM/60) * (1 - (d/D)*cos(θ)).' },
    { term: 'BPFI', category: 'Vibration Physics', definition: 'Ball Pass Frequency Inner Race. Defect frequency when rolling elements traverse an inner raceway defect. Formula: BPFI = (N/2) * (RPM/60) * (1 + (d/D)*cos(θ)).' },
    { term: 'BSF', category: 'Vibration Physics', definition: 'Ball Spin Frequency. Rotational frequency of individual rolling elements spinning against raceways. Flaws on balls generate impacts at BSF.' },
    { term: 'CHT', category: 'Telemetry', definition: 'Cylinder Head Temperature. Critical thermodynamic parameter indicating thermal dissipation and combustion zone equilibrium. Nominal 140°C–175°C.' },
    { term: 'CNN', category: 'AI/ML', definition: 'Convolutional Neural Network. Deep learning architecture employing 1D convolutional kernels to automatically extract invariant spatial and harmonic features from raw time-series vibration.' },
    { term: 'DAQ', category: 'Hardware', definition: 'Data Acquisition. Front-end electronic subsystem responsible for digitizing analog sensor voltages with synchronous sampling clock.' },
    { term: 'DMA', category: 'Embedded', definition: 'Direct Memory Access. Hardware feature of the STM32 microcontroller allowing peripheral ADC/SPI data to transfer directly to SRAM without CPU intervention, guaranteeing zero sample loss.' },
    { term: 'EGT', category: 'Telemetry', definition: 'Exhaust Gas Temperature. Measures thermal energy of post-combustion gases (nominal 680°C–760°C). Vital for detecting misfires, lean/rich burns, and injector clogs.' },
    { term: 'FFT', category: 'DSP', definition: 'Fast Fourier Transform. Efficient algorithmic implementation to convert discrete time-domain signals into frequency-domain spectral magnitude and phase.' },
    { term: 'FTF', category: 'Vibration Physics', definition: 'Fundamental Train Frequency. Rotational speed of the bearing cage assembly holding rolling elements together.' },
    { term: 'LSTM', category: 'AI/ML', definition: 'Long Short-Term Memory. Recurrent neural network architecture equipped with input, forget, and output gates to capture long-range temporal trends and progressive mechanical degradation.' },
    { term: 'MALE', category: 'Aviation', definition: 'Medium Altitude Long Endurance. Class of Unmanned Aerial Vehicles (UAVs) operating at altitudes of 10,000 to 30,000 feet for prolonged mission durations (12 to 36+ hours).' },
    { term: 'RUL', category: 'Prognostics', definition: 'Remaining Useful Life. Estimated number of operational flight hours or engine cycles remaining before a degrading component exceeds the critical failure threshold (integrity < 40%).' },
    { term: 'STFT', category: 'DSP', definition: 'Short-Time Fourier Transform. Time-frequency analysis technique that applies moving window FFTs to reveal how spectral frequencies evolve over time.' },
    { term: 'UAV', category: 'Aviation', definition: 'Unmanned Aerial Vehicle. Remotely piloted or autonomous aircraft used for reconnaissance, tactical payload, and logistics missions.' },
    { term: 'WPD', category: 'DSP', definition: 'Wavelet Packet Decomposition. Multi-resolution signal processing algorithm that decomposes both low- and high-frequency bands iteratively, providing rich sub-band energy distribution vectors.' },
  ];

  const filteredGlossary = glossaryItems.filter(
    (item) =>
      item.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      item.definition.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      item.category.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto animate-in fade-in duration-300 pb-12">
      {/* Top Banner */}
      <div className="neo-card bg-[var(--color-brand-blue)] text-white p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-brand-yellow)] font-mono text-xs font-bold uppercase mb-1">
            <BookOpen size={16} /> SIH26054 Prototype Knowledge Engine
          </div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">
            Vibro-AI Interactive Technical Guide
          </h1>
          <p className="text-gray-300 text-sm font-mono mt-1 max-w-2xl">
            A comprehensive reference for multi-parameter sensor fusion, signal processing, AI diagnostics, physics residual modeling, and edge hardware architecture.
          </p>
        </div>
        <div className="p-3 bg-black/40 border-2 border-[var(--color-brand-yellow)] text-xs font-mono text-right shrink-0">
          <div className="text-[var(--color-brand-yellow)] font-bold">SIH26054 • T CUBE</div>
          <div className="text-gray-300">Internal Prototype Roadmap</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <div className="neo-card p-3 bg-white sticky top-24">
            <div className="text-xs font-bold uppercase text-gray-500 mb-2 border-b-2 border-black pb-1">
              Table of Contents
            </div>
            <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => {
                    setActiveSection(sec.id);
                    const el = document.getElementById(sec.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={cn(
                    "w-full text-left p-2 text-xs font-bold font-mono transition-all flex items-center gap-2 border",
                    activeSection === sec.id
                      ? "border-black bg-black text-white shadow-[var(--shadow-neobrutalism-sm)] translate-x-1"
                      : "border-transparent hover:border-black hover:bg-gray-100"
                  )}
                >
                  <span className={activeSection === sec.id ? "text-[var(--color-brand-yellow)]" : "text-gray-500"}>
                    {sec.icon}
                  </span>
                  <span className="truncate">{sec.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="lg:col-span-3 space-y-8">

          {/* 01 Overview */}
          <section id="01-overview" className="neo-card bg-white p-6 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight">01 — Overview</h2>
              <span className="neo-badge bg-[var(--color-brand-green)] text-black">FOUNDATION</span>
            </div>
            <p className="text-sm font-mono leading-relaxed">
              <strong>Vibro-AI</strong> is an intelligent, edge-deployable health and prognostic monitoring system designed specifically for UAV (Unmanned Aerial Vehicle) piston engines. While mechanical vibration serves as the primary high-frequency fingerprint for structural faults, Vibro-AI explicitly integrates <strong>9 multi-parameter telemetry streams</strong> into a unified sensor-fusion pipeline.
            </p>
            <div className="p-4 bg-[var(--color-brand-light)] border-2 border-black font-mono text-sm space-y-2">
              <div className="font-bold text-black uppercase">Core System Philosophy:</div>
              <div className="text-xs bg-white p-2 border border-black font-bold text-center">
                Multi-Parameter Telemetry → Sensor Fusion → DSP + Physics Models → 1D-CNN/LSTM AI → Health & Severity → RUL Prognostics → Digital Twin → Actionable Maintenance Decision
              </div>
            </div>
          </section>

          {/* 02 Problem & Motivation */}
          <section id="02-problem-motivation" className="neo-card bg-white p-6 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight">02 — Problem & Motivation</h2>
              <span className="neo-badge bg-[var(--color-brand-yellow)] text-black">MOTIVATION</span>
            </div>
            <p className="text-sm font-mono leading-relaxed">
              In tactical UAV operations, unanticipated engine failures during flight lead to mission aborts or catastrophic airframe loss. Traditional threshold-based health monitoring suffers from high false-alarm rates because a vibration spike during rapid throttle application is physically benign, whereas an identical vibration spike at idle indicates impending bearing seizure.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border-2 border-black bg-red-50 space-y-2">
                <div className="font-bold text-sm text-red-900 uppercase">Single-Vibration Systems (Flawed)</div>
                <ul className="text-xs font-mono space-y-1 text-red-800">
                  <li>• High false alarm rate during flight maneuvers</li>
                  <li>• Blind to thermal and lubrication failure modes</li>
                  <li>• Cannot distinguish sensor drift from mechanical fault</li>
                  <li>• No operating-speed context normalization</li>
                </ul>
              </div>
              <div className="p-4 border-2 border-black bg-green-50 space-y-2">
                <div className="font-bold text-sm text-green-900 uppercase">Vibro-AI Multi-Parameter Fusion</div>
                <ul className="text-xs font-mono space-y-1 text-green-800">
                  <li>• RPM context normalizes dynamic kinematic orders</li>
                  <li>• CHT/EGT/Oil residuals cross-validate fault physics</li>
                  <li>• 99.4% false-positive rejection via sensor voting</li>
                  <li>• True predictive RUL before catastrophic seizure</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 03 System Architecture */}
          <section id="03-system-architecture" className="neo-card bg-white p-6 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight">03 — System Architecture</h2>
              <span className="neo-badge bg-[var(--color-brand-blue)] text-white">PIPELINE</span>
            </div>
            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center">
                <div className="p-3 border-2 border-black bg-gray-100">
                  <div className="font-bold text-sm mb-1">1. SENSORS</div>
                  <div>ADXL355 (Vib), Thermocouples (CHT/EGT), Pressure, Hall Effect</div>
                </div>
                <div className="p-3 border-2 border-black bg-gray-100">
                  <div className="font-bold text-sm mb-1">2. DAQ LAYER</div>
                  <div>STM32 Microcontroller + DMA Buffer + CAN Bus</div>
                </div>
                <div className="p-3 border-2 border-black bg-gray-100">
                  <div className="font-bold text-sm mb-1">3. EDGE INFERENCE</div>
                  <div>Raspberry Pi CM4 (CNN-LSTM + DSP + Kalman Fusion)</div>
                </div>
                <div className="p-3 border-2 border-black bg-gray-100">
                  <div className="font-bold text-sm mb-1">4. DIGITAL TWIN</div>
                  <div>Physics Residuals + 3D/2D Spatial Component State</div>
                </div>
                <div className="p-3 border-2 border-black bg-[var(--color-brand-yellow)] text-black">
                  <div className="font-bold text-sm mb-1">5. DECISION</div>
                  <div>RUL Prognostics + Mission Advisory Checklist</div>
                </div>
              </div>
            </div>
          </section>

          {/* 04 Engine & Sensors */}
          <section id="04-engine-sensors" className="neo-card bg-white p-6 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight">04 — Engine & Sensors</h2>
              <span className="neo-badge bg-black text-white">9 PARAMETERS</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-4 border-black font-mono text-xs text-left">
                <thead className="bg-[var(--color-brand-light)] border-b-2 border-black">
                  <tr>
                    <th className="p-2 border-r border-black font-bold">PARAMETER</th>
                    <th className="p-2 border-r border-black font-bold">NOMINAL RANGE</th>
                    <th className="p-2 border-r border-black font-bold">DIAGNOSTIC ROLE</th>
                    <th className="p-2 font-bold">SENSOR HARDWARE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  <tr>
                    <td className="p-2 border-r border-black font-bold">Engine Speed (RPM)</td>
                    <td className="p-2 border-r border-black">3,200 – 3,800 RPM</td>
                    <td className="p-2 border-r border-black">Operating-speed normalization & harmonic order scaling</td>
                    <td className="p-2">Hall-Effect Pickup on Flywheel</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-black font-bold">Cylinder Head Temp (CHT)</td>
                    <td className="p-2 border-r border-black">140°C – 175°C</td>
                    <td className="p-2 border-r border-black">Cylinder thermal health, piston scuffing, cooling degradation</td>
                    <td className="p-2">Type-K Thermocouple (Cylinder Boss)</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-black font-bold">Exhaust Gas Temp (EGT)</td>
                    <td className="p-2 border-r border-black">680°C – 760°C</td>
                    <td className="p-2 border-r border-black">Combustion efficiency, misfire detection, valve leakage</td>
                    <td className="p-2">Inconel-Sheathed Thermocouple Probe</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-black font-bold">Oil Pressure</td>
                    <td className="p-2 border-r border-black">4.0 – 5.2 bar</td>
                    <td className="p-2 border-r border-black">Hydrodynamic journal lubrication film integrity</td>
                    <td className="p-2">Piezoresistive Transducer (0–10 bar)</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-black font-bold">Oil Temperature</td>
                    <td className="p-2 border-r border-black">75°C – 100°C</td>
                    <td className="p-2 border-r border-black">Thermal oxidation limit, bearing friction heat buildup</td>
                    <td className="p-2">RTD PT100 Probe in Oil Gallery</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-black font-bold">Fuel Flow Rate</td>
                    <td className="p-2 border-r border-black">15.0 – 20.0 L/h</td>
                    <td className="p-2 border-r border-black">Brake specific fuel consumption (BSFC), injector health</td>
                    <td className="p-2">Turbine Flow Meter</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-black font-bold">Vibration RMS (3-Axis)</td>
                    <td className="p-2 border-r border-black">0.5 – 1.5 g</td>
                    <td className="p-2 border-r border-black">High-frequency mechanical defect impact signatures</td>
                    <td className="p-2">ADXL355 3-Axis Digital Accelerometer</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-black font-bold">Battery / Alternator</td>
                    <td className="p-2 border-r border-black">26.5 – 29.0 V</td>
                    <td className="p-2 border-r border-black">Electrical bus health, ignition coil supply voltage</td>
                    <td className="p-2">Isolated Voltage Divider + ADC</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-black font-bold">Injection Timing</td>
                    <td className="p-2 border-r border-black">26.0° – 30.0° BTDC</td>
                    <td className="p-2 border-r border-black">Ignition timing phase, flame propagation synchronization</td>
                    <td className="p-2">ECU Crank Angle Encoder (60-2 Tooth)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 05 Sensor Fusion */}
          <section id="05-sensor-fusion" className="neo-card bg-white p-6 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight">05 — Sensor Fusion</h2>
              <span className="neo-badge bg-[var(--color-brand-yellow)] text-black">KALMAN / BAYESIAN</span>
            </div>
            <p className="text-sm font-mono leading-relaxed">
              Vibro-AI employs a <strong>Hybrid Feature-Level Sensor Fusion</strong> algorithm. Telemetry signals are normalized against real-time operating conditions (RPM and engine torque demand) to compute physics residuals. The vibration spectral likelihood vector is then multiplied with thermodynamic residual evidence:
            </p>
            <div className="p-3 bg-black text-[var(--color-brand-yellow)] font-mono text-xs border-2 border-black">
              P(Fault | Vib, CHT, OilP, EGT) ∝ P(Vib_Signature | Fault) × P(ΔCHT_Residual | Fault) × P(ΔOilP_Residual | Fault) × P_Prior
            </div>
            <p className="text-xs font-mono text-gray-600">
              This Bayesian hypothesis fusion prevents false alarms during transient throttle maneuvers and guarantees that low lubrication pressure or cooling loss is flagged before structural bearing destruction occurs.
            </p>
          </section>

          {/* 06 Signal Processing */}
          <section id="06-signal-processing" className="neo-card bg-white p-6 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight">06 — Signal Processing (DSP)</h2>
              <span className="neo-badge bg-[var(--color-brand-green)] text-black">FFT / STFT / WPD</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 border-2 border-black bg-gray-50">
                <div className="font-bold uppercase text-sm mb-1">Fast Fourier Transform (FFT)</div>
                <p className="text-gray-600">Converts raw 1kHz time-domain buffer into 0–500Hz discrete frequency spectra. Employs a 512-point Hanning window to mitigate spectral leakage.</p>
              </div>
              <div className="p-3 border-2 border-black bg-gray-50">
                <div className="font-bold uppercase text-sm mb-1">Short-Time Fourier (STFT)</div>
                <p className="text-gray-600">Computes overlapping windowed spectrograms across a sliding time horizon (T-4s to Now) to detect non-stationary transient events.</p>
              </div>
              <div className="p-3 border-2 border-black bg-gray-50">
                <div className="font-bold uppercase text-sm mb-1">Wavelet Decomposition (WPD)</div>
                <p className="text-gray-600">Decomposes signal into 8 distinct sub-bands (62.5 Hz width) to quantify energy concentration across sub-harmonic, fundamental, and high-frequency shock regimes.</p>
              </div>
            </div>
          </section>

          {/* 07 AI Fault Diagnosis */}
          <section id="07-ai-fault-diagnosis" className="neo-card bg-white p-6 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight">07 — AI Fault Diagnosis</h2>
              <span className="neo-badge bg-[var(--color-brand-blue)] text-white">CNN-LSTM</span>
            </div>
            <p className="text-sm font-mono leading-relaxed">
              The AI classification pipeline combines a 1D Convolutional Neural Network (CNN) for spatial feature extraction with a Long Short-Term Memory (LSTM) sequence layer for temporal dependency tracking:
            </p>
            <div className="space-y-2 font-mono text-xs">
              <div className="p-2 border-l-4 border-[var(--color-brand-blue)] bg-gray-50 pl-3">
                <strong>Layer 1 (1D-CNN):</strong> 3 convolutional blocks (Kernel sizes: 15, 7, 3; Filters: 32, 64, 128) + BatchNorm + LeakyReLU + MaxPooling.
              </div>
              <div className="p-2 border-l-4 border-[var(--color-brand-blue)] bg-gray-50 pl-3">
                <strong>Layer 2 (Bidirectional LSTM):</strong> 64 hidden units tracking sequential degradation trends across sequential 0.5s windows.
              </div>
              <div className="p-2 border-l-4 border-[var(--color-brand-blue)] bg-gray-50 pl-3">
                <strong>Layer 3 (Dense & Softmax):</strong> Multi-class probability distribution across all 12 fault categories with calibrated temperature scaling.
              </div>
            </div>
          </section>

          {/* 08 Fault Signatures */}
          <section id="08-fault-signatures" className="neo-card bg-white p-6 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight">08 — Fault Signatures (BPFO/BPFI/BSF)</h2>
              <span className="neo-badge bg-black text-white">KINEMATICS</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-3 border-2 border-black bg-white">
                <div className="font-bold text-sm mb-1">Outer Race Defect (BPFO)</div>
                <div className="bg-gray-100 p-2 border border-black my-1 font-bold">
                  BPFO = (N/2) × (RPM/60) × [1 − (d/D)·cos(θ)]
                </div>
                <p className="text-gray-600">At 3,600 RPM with N=8 balls, BPFO = ~150 Hz. Generates sharp periodic shock transients with high crest factor.</p>
              </div>
              <div className="p-3 border-2 border-black bg-white">
                <div className="font-bold text-sm mb-1">Ball Spin Defect (BSF)</div>
                <div className="bg-gray-100 p-2 border border-black my-1 font-bold">
                  BSF = (D/2d) × (RPM/60) × [1 − ((d/D)·cos(θ))²]
                </div>
                <p className="text-gray-600">BSF occurs at ~80 Hz, amplitude modulated by cage rotation FTF (~24 Hz).</p>
              </div>
            </div>
          </section>

          {/* 09 Severity Estimation */}
          <section id="09-severity-estimation" className="neo-card bg-white p-6 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight">09 — Severity Estimation</h2>
              <span className="neo-badge bg-[var(--color-brand-yellow)] text-black">HEALTH SCALE</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center font-mono text-xs">
              <div className="p-3 border-2 border-black bg-green-100">
                <div className="font-bold">NOMINAL</div>
                <div>Health 85–100%</div>
                <div className="text-[10px] text-gray-600 mt-1">Normal flight operations</div>
              </div>
              <div className="p-3 border-2 border-black bg-blue-100">
                <div className="font-bold">LOW</div>
                <div>Health 70–84%</div>
                <div className="text-[10px] text-gray-600 mt-1">Incipient micro-wear</div>
              </div>
              <div className="p-3 border-2 border-black bg-yellow-100">
                <div className="font-bold">MEDIUM</div>
                <div>Health 50–69%</div>
                <div className="text-[10px] text-gray-600 mt-1">Maintenance flag</div>
              </div>
              <div className="p-3 border-2 border-black bg-orange-100">
                <div className="font-bold">HIGH</div>
                <div>Health 40–49%</div>
                <div className="text-[10px] text-gray-600 mt-1">Urgent inspection</div>
              </div>
              <div className="p-3 border-2 border-black bg-red-100 text-red-900">
                <div className="font-bold">CRITICAL</div>
                <div>Health &lt; 40%</div>
                <div className="text-[10px] font-bold mt-1">Immediate Grounding</div>
              </div>
            </div>
          </section>

          {/* 10 RUL Prognostics */}
          <section id="10-rul" className="neo-card bg-white p-6 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight">10 — Remaining Useful Life (RUL)</h2>
              <span className="neo-badge bg-[var(--color-brand-blue)] text-white">PROGNOSTICS</span>
            </div>
            <p className="text-sm font-mono leading-relaxed">
              RUL estimation models the degradation trajectory from current engine health down to the 40% failure boundary. The prognostic engine solves Paris' crack growth power law coupled with an exponential hazard function:
            </p>
            <div className="p-3 bg-gray-100 border-2 border-black font-mono text-xs">
              da/dN = C · (ΔK)^m &nbsp;|&nbsp; RUL(Cycles) = ∫ [1 / (λ · (t)^β)] dt
            </div>
            <p className="text-xs font-mono text-gray-600">
              Each cycle represents one full thermal run profile (~0.45 flight hours).
            </p>
          </section>

          {/* 11 Digital Twin */}
          <section id="11-digital-twin" className="neo-card bg-white p-6 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight">11 — Digital Twin Model</h2>
              <span className="neo-badge bg-[var(--color-brand-green)] text-black">VIRTUAL ENGINE</span>
            </div>
            <p className="text-sm font-mono leading-relaxed">
              The Digital Twin is a real-time synchronized virtual representation of the engine sub-assemblies (Cylinder block, Piston, Connecting rod, Crankshaft, Main Bearings, Valves, Injectors, Cooling shroud, and Sump). It maps diagnostic probabilities directly onto mechanical spatial coordinates to immediately direct ground technicians to the exact failing sub-assembly.
            </p>
          </section>

          {/* 12 Edge Computing */}
          <section id="12-edge-computing" className="neo-card bg-white p-6 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight">12 — Edge Computing (STM32 / CM4)</h2>
              <span className="neo-badge bg-black text-white">HARDWARE STACK</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-3 border-2 border-black bg-gray-50 space-y-1">
                <div className="font-bold text-sm">STM32F4/G4 Microcontroller (DAQ)</div>
                <p>• High-speed SPI interface to ADXL355 accelerometer (1 kHz sampling)</p>
                <p>• Circular DMA double-buffer preventing frame drops</p>
                <p>• CAN Bus 2.0B broadcast to UAV Flight Management System (FMS)</p>
              </div>
              <div className="p-3 border-2 border-black bg-[var(--color-brand-blue)] text-white space-y-1">
                <div className="font-bold text-sm text-[var(--color-brand-yellow)]">Raspberry Pi Compute Module 4 (CM4)</div>
                <p>• Quad-core ARM Cortex-A72 @ 1.5 GHz</p>
                <p>• ONNX Runtime / TensorRT optimized 1D-CNN/LSTM inference &lt; 20 ms</p>
                <p>• Houses digital twin physics model and local telemetry server</p>
              </div>
            </div>
          </section>

          {/* 13 Mission Simulation & Replay */}
          <section id="13-mission-simulation-replay" className="neo-card bg-white p-6 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight">13 — Mission Simulation & Replay</h2>
              <span className="neo-badge bg-[var(--color-brand-yellow)] text-black">TACTICAL PROFILES</span>
            </div>
            <p className="text-sm font-mono leading-relaxed">
              Vibro-AI includes four pre-programmed UAV flight profiles (Endurance Cruise, High-Altitude Patrol, Hot-Weather Loiter, and Rapid-Throttle Combat). The synchronized mission replay scrubber allows judges and engineers to step through a 2-hour flight timeline to watch degradation evolve from incipient wear to critical maintenance threshold.
            </p>
          </section>

          {/* 14 Searchable Glossary */}
          <section id="14-glossary" className="neo-card bg-white p-6 space-y-4">
            <div className="flex flex-wrap justify-between items-center border-b-4 border-black pb-2 gap-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight">14 — Searchable Technical Glossary</h2>
              <span className="neo-badge bg-black text-white">{filteredGlossary.length} TERMS</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3.5 text-gray-500" />
              <input
                type="text"
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                placeholder="Search abbreviations, terms (e.g. BPFO, ADXL355, CHT, RUL, WPD)..."
                className="w-full neo-input pl-10 font-mono text-sm"
              />
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredGlossary.map((item, i) => (
                <div key={i} className="p-3 border-2 border-black bg-gray-50 hover:bg-white transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-base font-mono text-[var(--color-brand-blue)]">
                      {item.term}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-black bg-white">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs font-mono leading-relaxed text-gray-800">
                    {item.definition}
                  </p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
