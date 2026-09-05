<div align="center">

```
██╗   ██╗██╗██████╗ ██████╗  ██████╗         █████╗ ██╗
██║   ██║██║██╔══██╗██╔══██╗██╔═══██╗       ██╔══██╗██║
██║   ██║██║██████╔╝██████╔╝██║   ██║█████╗ ███████║██║
╚██╗ ██╔╝██║██╔══██╗██╔══██╗██║   ██║╚════╝ ██╔══██║██║
 ╚████╔╝ ██║██████╔╝██║  ██║╚██████╔╝       ██║  ██║██║
  ╚═══╝  ╚═╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝        ╚═╝  ╚═╝╚═╝
```

# VIBRO-AI // MULTI-PARAMETER ENGINE HEALTH & PROGNOSTICS
### AI-Powered Multi-Sensor Prognostics, DSP & Interactive Digital Twin for UAV Engines

```
STATUS: OPERATIONAL  │  UI: NEOBRUTALISM  │  INFERENCE: ~21MS  │  TARGET: ROTAX 912 / UAV-DRDO-07
```

<br />

[![GitHub Repo](https://img.shields.io/badge/GITHUB-Vibro--AI-000000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mmuthuselvam298/Vibro-AI)
[![Problem Statement](https://img.shields.io/badge/SIH26054-MULTI--PARAMETER_PROGNOSTICS-FFD500?style=for-the-badge&labelColor=000&logoColor=FFD500)](#)
[![Status](https://img.shields.io/badge/SYSTEM-MISSION_READY-34C759?style=for-the-badge&logoColor=white&labelColor=000)](#)
[![Model](https://img.shields.io/badge/AI-CNN--LSTM_+_PHYSICS_RESIDUALS-0A2540?style=for-the-badge&logoColor=white&labelColor=0A2540)](#)

<br />

[![React](https://img.shields.io/badge/REACT_19-000000?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TYPESCRIPT_5-000000?style=flat-square&logo=typescript&logoColor=3178C6)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/VITE_8-000000?style=flat-square&logo=vite&logoColor=646CFF)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TAILWIND_4-000000?style=flat-square&logo=tailwindcss&logoColor=06B6D4)](https://tailwindcss.com)
[![Zustand](https://img.shields.io/badge/ZUSTAND_5-000000?style=flat-square&logo=redux&logoColor=white)](https://github.com/pmndrs/zustand)
[![Recharts](https://img.shields.io/badge/RECHARTS_2-000000?style=flat-square&logo=chartdotjs&logoColor=FF6384)](https://recharts.org)

<br />

---

</div>

## ▓▓ 01 // SYSTEM ARCHITECTURE & OVERVIEW

> **Vibro-AI** is an edge-grade **Multi-Parameter Predictive Health, Prognostics & Digital Twin Command Center** engineered specifically for internal-combustion UAV engines (Rotax 912 / 4-stroke boxer configurations). 

Moving beyond single-accelerometer monitoring, Vibro-AI synthesizes **9 synchronized telemetry channels** (Vibration, CHT, EGT, Oil Pressure, Oil Temp, Fuel Flow, RPM, Battery Voltage, and Injection Timing) to eliminate false alarms and detect mechanical, thermal, combustion, and lubrication degradation long before catastrophic failure occurs.

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                 ONBOARD SENSOR TAP & TELEMETRY ARRAY                   │
  │  ADXL355 (Vib) │ CHT Thermocouple │ EGT Probe │ Oil P/T │ Fuel Flow    │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │ DMA Stream (1.0 kHz / 20 Hz)
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │               STM32 DAQ & EDGE SIGNAL PRE-PROCESSING                   │
  │    Anti-Aliasing Filter │ FIR Hanning Window │ Time-Domain Features    │
  │    (RMS, Peak, Crest Factor, Kurtosis, Skewness, HF Energy Ratio)      │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                     ┌────────────────┴────────────────┐
                     ▼                                 ▼
      ┌─────────────────────────────┐   ┌─────────────────────────────┐
      │     CNN-LSTM AI INFERENCE   │   │   PHYSICS RESIDUAL ENGINE   │
      │   Time-Frequency Spectrogram│   │   Expected vs Observed Δ    │
      │   Softmax Classification    │   │   Thermodynamic & Hydraulic │
      └──────────────┬──────────────┘   └──────────────┬──────────────┘
                     │                                 │
                     └────────────────┬────────────────┘
                                      │ Multi-Parameter Fusion
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                 VIBRO-AI TACTICAL COMMAND CENTER                       │
  │  • Real-Time Vibration Trace    • Spatial Vector Digital Twin          │
  │  • FFT Harmonic Analyzer        • Dynamic RUL Prognostic Curve         │
  │  • Actionable Maintenance Order • Interactive 14-Chapter Guide         │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## ▓▓ 02 // MULTI-PARAMETER SENSOR FUSION (9 CHANNELS)

Vibro-AI fuses 9 physical parameters into a unified Bayesian evidence framework:

| CHANNEL | SENSOR / SOURCE | UNITS | NOMINAL RANGE | PHYSICAL OBSERVABILITY ROLE |
|:---|:---|:---:|:---:|:---|
| **Vibration RMS** | ADXL355 Triaxial Accel. | `g` | `0.40 – 1.80` | High-frequency mechanical shock, bearing BPFO/BSF impacts |
| **Engine Speed** | Hall-Effect Crank Pulse | `RPM` | `3200 – 3800` | Operational baseline context & kinematic order normalization |
| **Cylinder Head Temp** | K-Type Thermocouple | `°C` | `140 – 175` | Combustion chamber thermal health, piston slap friction heat |
| **Exhaust Gas Temp** | Exhaust Probe Sensor | `°C` | `680 – 760` | Cylinder-by-cylinder combustion completeness & misfire delta |
| **Oil Pressure** | Piezoresistive Transducer | `bar` | `4.00 – 5.20` | Journal bearing hydrodynamic lubrication film integrity |
| **Oil Temperature** | PT100 RTD Probe | `°C` | `75 – 100` | Viscosity degradation, journal friction thermal dissipation |
| **Fuel Flow Rate** | Turbine Flowmeter | `L/h` | `15.0 – 20.0` | Brake Specific Fuel Consumption (BSFC) & injector drift |
| **Battery Voltage** | Voltage Divider / ADC | `V` | `13.6 – 14.4` | Alternator integrity, ignition coil primary supply stability |
| **Injection Timing** | ECU Timing Feedback | `°BTDC`| `24.0 – 28.0` | Spark/injection advance angle, pre-ignition detection |

---

## ▓▓ 03 // 12 PHYSICS-INFORMED FAULT SCENARIOS

The onboard deterministic engine simulates 12 kinematic, thermal, and combustion degradation modes:

```
┌────┬─────────────────────────────┬──────────┬──────────┬────────┬────────────────────────────────────────────────────────┐
│ #  │ FAULT SCENARIO              │ SEVERITY │ HEALTH % │ RUL    │ PHYSICAL SIGNATURE & MULTI-SENSOR CORRELATION         │
├────┼─────────────────────────────┼──────────┼──────────┼────────┼────────────────────────────────────────────────────────┤
│ 1  │ Healthy Baseline            │ NOMINAL  │ 96.0%    │ 185 c  │ Gaussian baseline (Kurtosis ≈ 3.0), all residuals ~ 0  │
│ 2  │ Early Bearing Wear (BPFO)   │ MEDIUM   │ 72.0%    │ 91 c   │ 150Hz outer-race impact sidebands, elevated Crest Fact.│
│ 3  │ Severe Bearing Wear         │ CRITICAL │ 31.0%    │ 17 c   │ Multi-harmonic BPFO flaking, Kurtosis > 7.0, metal-gap│
│ 4  │ Piston Skirt Slap           │ HIGH     │ 58.0%    │ 52 c   │ TDC/BDC lateral impact bursts + elevated CHT thermal Δ │
│ 5  │ Excessive Valve Lash        │ MEDIUM   │ 74.0%    │ 104 c  │ 4X valve-train seating clicks, elevated EGT variation  │
│ 6  │ Rolling Element Defect(BSF) │ HIGH     │ 48.0%    │ 39 c   │ 80Hz ball spin impact modulated by carrier train freq  │
│ 7  │ Cylinder Misfire            │ CRITICAL │ 38.0%    │ 24 c   │ Severe RPM fluctuation, EGT sharp drop (-120°C), unburn│
│ 8  │ Injector Clogging / Drift   │ HIGH     │ 54.0%    │ 47 c   │ Fuel flow drop, lean cylinder combustion, elevated EGT │
│ 9  │ Low Oil Pressure            │ CRITICAL │ 29.0%    │ 14 c   │ Oil P < 3.0 bar, oil temp surge, hydrodynamic breakdown│
│ 0  │ Thermal Runaway (Overheat)  │ CRITICAL │ 22.0%    │ 8 c    │ CHT > 200°C, high thermal expansion clearance pinch    │
│ -  │ ADXL355 Sensor Drift        │ LOW      │ 88.0%    │ 160 c  │ DC offset drift while thermodynamic channels match nom │
│ =  │ Combustion Instability      │ HIGH     │ 51.0%    │ 43 c   │ Cyclical torque surges, fluctuating EGT & fuel flow    │
└────┴─────────────────────────────┴──────────┴──────────┴────────┴────────────────────────────────────────────────────────┘
```

---

## ▓▓ 04 // DSP SIGNAL PROCESSING PIPELINE

The DSP pipeline executes real-time spectral decomposition and statistical feature extraction:

1. **Time-Domain Statistics**:
   - **RMS (Root Mean Square)**: Overall vibrational energy load ($g$).
   - **Peak Acceleration**: Transient impact shock amplitude.
   - **Crest Factor**: Ratio of peak to RMS ($>4.0$ indicates impulsive bearing or piston slap).
   - **Kurtosis**: 4th statistical moment measuring distribution tails ($>3.5$ indicates non-Gaussian shock bursts).
   - **Skewness**: Measure of wave symmetry across compression/expansion strokes.
   - **HF Energy Ratio**: Ultrasonic frictional energy above $300\text{ Hz}$.

2. **Frequency-Domain Spectral Analysis (FFT)**:
   - 1024-point Hanning-windowed Fast Fourier Transform.
   - Automated spectral marker overlay:
     - `1X (60 Hz)`: Shaft rotational fundamental.
     - `2X (120 Hz)`: Second rotational harmonic / crankshaft unbalance.
     - `BPFO (150 Hz)`: Ball Pass Frequency Outer Race defect marker.
     - `BSF (80 Hz)`: Ball Spin Frequency defect marker.
     - `4X (240 Hz)`: 4-cylinder engine valve event seating order.

3. **Time-Frequency Spectrogram (STFT) & Wavelet Packet Decomposition (WPD)**:
   - 8-band energy matrix isolating sub-synchronous, synchronous, harmonic, and high-frequency wavelets.

---

## ▓▓ 05 // VECTOR DIGITAL TWIN & SUB-ASSEMBLY LOCALIZATION

The interactive vector-based engine schematic maps kinematic anomalies and sensor feeds directly onto physical sub-assemblies:

- **Cylinder Bore & Piston Body**: Dynamic stroke motion, ring wear tracking, piston slap impact detection.
- **Main Crank Bearings (Inner/Outer Race)**: Hydrodynamic clearance and spalling visualization.
- **Rolling Elements (Balls/Rollers)**: Real-time ball spin locus and micro-pitting fatigue.
- **Valve Train & Overhead Cam**: Valve lash gap opening and seat impact force tracking.
- **Fuel Injector & Rail**: Delivery pressure and spray drift monitoring.
- **Oil Sump & Hydraulic Pump**: Hydrostatic lubrication pressure and thermal dissipation.

---

## ▓▓ 06 // PROGNOSTICS & REMAINING USEFUL LIFE (RUL)

- **Exponential Hazard Model**: Combines Paris' Law crack propagation with Arrhenius thermal acceleration.
- **Dynamic Degradation Rate**: Computes wear rate per 100 operational cycles based on active thermal, mechanical, and combustion stress.
- **Prognostic Confidence Bounds**: Plots $[\text{Lower}, \text{Upper}]$ 95% confidence intervals across future mission horizons.
- **Failure Threshold Alert**: Strict 40% health cutoff triggering automatic mission abatement procedures.

---

## ▓▓ 07 // MISSION SIMULATOR & FLIGHT REPLAY

Simulates realistic mission scenarios with dynamic throttle, altitude, and ambient temperatures:
- **Endurance Cruise**: MALE UAV standard loiter at 10,000 ft, steady cruise RPM.
- **High-Altitude Patrol**: 18,000 ft operational ceiling, reduced ambient pressure, elevated throttle load.
- **Hot-Weather Loiter**: 45°C ambient thermal stress, reduced cooling shroud efficiency.
- **Rapid-Throttle Evasion**: High-transient maneuvers with cyclic torque spikes.
- **Timeline Scrubber**: Interactive 120-minute mission scrubber with `1X`, `2X`, and `5X` telemetry replay speed controls.

---

## ▓▓ 08 // NEOBRUTALISM DESIGN SPECIFICATION

Built for high-contrast visibility in tactical ground control stations (GCS) and cockpit tablets:

```css
/* NEOBRUTALISM DESIGN TOKENS */
--border-weight:              4px solid #000000;
--shadow-neobrutalism:        4px 4px 0px 0px #000000;
--shadow-neobrutalism-sm:     2px 2px 0px 0px #000000;
--shadow-neobrutalism-hover:  6px 6px 0px 0px #000000;

--color-brand-blue:           #0A2540;   /* Tactical Navy     */
--color-brand-yellow:         #FFD500;   /* High-Vis Warning  */
--color-brand-red:            #FF3B30;   /* Critical Alarm    */
--color-brand-green:          #34C759;   /* Nominal State     */
--color-brand-light:          #F4F5F7;   /* Technical Grey    */
```

---

## ▓▓ 09 // LOCAL QUICKSTART

### Prerequisites
- Node.js 18+ / npm 9+
- Modern Web Browser (Chrome, Safari, Firefox, Edge)

### Installation & Execution

```bash
# 1. Clone repository
git clone https://github.com/mmuthuselvam298/Vibro-AI.git
cd Vibro-AI

# 2. Install dependencies
npm install

# 3. Launch local development server with host exposure
npm run dev -- --host
```

Open your browser at:
- **Local:** `http://localhost:5173/`
- **Network / LAN:** `http://<your-local-ip>:5173/`

### Keyboard Shortcuts
- `1` to `0`, `-`, `=`: Instantly trigger any of the 12 fault scenarios.
- `Space`: Pause / Resume simulation.
- `D`: Toggle Scenario Controller console.

### Production Build

```bash
# Compile TypeScript and generate minified bundle
npm run build

# Preview production build locally
npm run preview
```

---

## ▓▓ 10 // REPOSITORY STRUCTURE

```
vibro-ai/
├── public/                 # Static assets & Netlify SPA routing
├── src/
│   ├── components/
│   │   ├── dashboard/      # Core dashboard widgets
│   │   │   ├── AlertBanner.tsx              # System state banner
│   │   │   ├── HeroMetrics.tsx              # 4 Top KPI gauges
│   │   │   ├── SensorFusionCard.tsx         # Multi-parameter synthesis
│   │   │   ├── TelemetryGrid.tsx            # 9-Channel sensor cards
│   │   │   ├── LiveVibration.tsx            # ADXL355 waveform scope
│   │   │   ├── DigitalTwin.tsx              # Spatial engine schematic SVG
│   │   │   ├── DiagnosisPanel.tsx           # AI classification distribution
│   │   │   ├── SignalAnalysis.tsx           # FFT spectrum & markers
│   │   │   ├── DegradationChart.tsx         # Dynamic RUL wear curve
│   │   │   ├── PhysicsResidualPanel.tsx     # First-principles delta model
│   │   │   ├── MaintenanceAdvisoryPanel.tsx # Actionable engineering orders
│   │   │   ├── MissionReplayWidget.tsx      # Flight timeline scrubber
│   │   │   └── DemoControls.tsx             # Scenario selector console
│   │   └── layout/         # Header, Sidebar, and App layout
│   ├── pages/              # Dedicated full-screen modules
│   │   ├── CommandCenter.tsx                # Primary operations deck
│   │   ├── SignalAnalysisPage.tsx           # High-res FFT, STFT & Wavelets
│   │   ├── FaultDiagnosisPage.tsx           # Deep AI classification & evidence
│   │   ├── DigitalTwinPage.tsx              # Sub-assembly health ledger
│   │   ├── DegradationPage.tsx              # Multi-parameter RUL forecasting
│   │   ├── EvidenceHardwarePage.tsx         # Sensor specs & DAQ architecture
│   │   ├── SystemStatusPage.tsx             # Compute latency & CAN statistics
│   │   └── SystemGuidePage.tsx              # 14-Chapter reference manual
│   ├── store/              # Zustand state management
│   │   ├── engineStore.ts                   # 12 Scenarios, Telemetry & Physics
│   │   └── signalStore.ts                   # Waveforms, FFT & DSP features
│   ├── hooks/
│   │   └── useSimulation.ts                 # 20 Hz / 60 Hz physics loop
│   └── App.tsx             # Client-side router configuration
├── index.html              # HTML5 entrypoint
├── package.json            # Dependencies & build scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build & bundler configuration
```

---

<div align="center">

**VIBRO-AI — ENGINEERED FOR UNCOMPROMISING MISSION RELIABILITY.**

Built by **[@mmuthuselvam298](https://github.com/mmuthuselvam298)**

</div>
