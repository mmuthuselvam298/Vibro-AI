# Vibro-AI — Authoritative Digital Twin & Prognostics for UAV Engines

> **In Plain English:** When an unmanned aircraft (UAV) is flying, an unexpected engine failure can destroy the entire aircraft. Traditional cockpit warning alarms only buzz *after* critical damage or engine seizure has already happened. **Vibro-AI** continuously listens to subtle vibrations, temperatures, and pressures across 9 engine sensors—acting like an engineering diagnostic stethoscope—to catch worn bearings, loose valves, and sensor drift hours before any failure. It gives ground crews a clear **Health Score (0–100%)**, **Mission Phase Risk Evaluation**, and an **Estimated Operating Margin** so flight teams can prevent mid-air aborts.

---

<div align="center">

```
██╗   ██╗██╗██████╗ ██████╗  ██████╗         █████╗ ██╗
██║   ██║██║██╔══██╗██╔══██╗██╔═══██╗       ██╔══██╗██║
██║   ██║██║██████╔╝██████╔╝██║   ██║█████╗ ███████║██║
╚██╗ ██╔╝██║██╔══██╗██╔══██╗██║   ██║╚════╝ ██╔══██║██║
 ╚████╔╝ ██║██████╔╝██║  ██║╚██████╔╝       ██║  ██║██║
  ╚═══╝  ╚═╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝        ╚═╝  ╚═╝╚═╝
```

### Authoritative FastAPI Backend • Random Forest Classifier • Real-Time WebSockets • Digital Twin

```
STATUS: IMPLEMENTED & TESTED  │  BACKEND: FASTAPI + PYTHON 3.12  │  ML: SCIKIT-LEARN RF (89.44% TEST ACC)
```

<br />

[![Live Vercel Frontend](https://img.shields.io/badge/VERCEL_FRONTEND-LIVE-FFD500?style=for-the-badge&logo=vercel&logoColor=000&labelColor=FFD500)](https://vibro-ai-main.vercel.app)
[![GitHub Repo](https://img.shields.io/badge/GITHUB-Vibro--AI-000000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mmuthuselvam298/Vibro-AI)
[![Problem Statement](https://img.shields.io/badge/SIH26054-MULTI--PARAMETER_PROGNOSTICS-FFD500?style=for-the-badge&labelColor=000&logoColor=FFD500)](https://vibro-ai-main.vercel.app)
[![Test Suite](https://img.shields.io/badge/BACKEND_TESTS-97_PASSED-34C759?style=for-the-badge&logoColor=white&labelColor=000)](https://github.com/mmuthuselvam298/Vibro-AI)
[![Model](https://img.shields.io/badge/ML-RANDOM_FOREST_(100_TREES)-0A2540?style=for-the-badge&logoColor=white&labelColor=0A2540)](#)

<br />

[![React](https://img.shields.io/badge/REACT_19-000000?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FASTAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/PYTHON_3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Scikit-Learn](https://img.shields.io/badge/SCIKIT_LEARN-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![TypeScript](https://img.shields.io/badge/TYPESCRIPT_5-000000?style=flat-square&logo=typescript&logoColor=3178C6)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/VITE_8-000000?style=flat-square&logo=vite&logoColor=646CFF)](https://vitejs.dev)

</div>

---

## ▓▓ 01 // SYSTEM ARCHITECTURE & SOURCE OF TRUTH

Vibro-AI uses a decoupled, production-ready full-stack architecture where the **FastAPI Python Backend is the single authoritative source of truth** for signal processing, machine learning inference, health degradation modeling, and Digital Twin telemetry.

```
                         OPERATOR / JUDGE
                                |
                                v
                      +--------------------+
                      |   VERCEL FRONTEND  |
                      |   React 19 + Vite  |
                      +---------+----------+
                                |
                          HTTPS / WSS
                                |
                                v
                      +--------------------+
                      |   RENDER BACKEND   |
                      |  FastAPI + Python  |
                      +--------------------+
                                |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
 9-Ch Telemetry        Vibration Waveforms       Flight Phase Context
 (RPM, CHT, EGT...)   (512 pts @ 1024 Hz)        (Takeoff, Climb...)
        |                       |                       |
        +---------------------->+<----------------------+
                                |
                                v
                    AUTHORITATIVE BACKEND DSP
          Radix-2 FFT • Hann Window • Moments • Bands
          (RMS, Peak, Kurtosis, Crest Factor, BPFO/BSF)
                                |
                                v
                  MULTI-SOURCE INTELLIGENCE ENGINE
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
 Trained Random Forest   Physics Residuals       Sensor DC Drift
 (scikit-learn model)   (Expected vs Observed)  (ADXL Fault Isolation)
        |                       |                       |
        +---------------------->+<----------------------+
                                |
                                v
                MULTI-EVIDENCE SYNTHESIS & AGREEMENT
              (Primary, Supporting, Conflicting Evidence)
                                |
                                v
                     HEALTH DEGRADATION & RUL
                  (Estimated Operating Margin)
                                |
                                v
                   DIGITAL TWIN SUBSYSTEM STATE
               (Mechanical, Thermal, Lubrication...)
                                |
                                v
                     MISSION-PHASE RISK & ACTION
                (Context-aware flight risk evaluation)
                                |
                                v
                     WEBSOCKET STREAM (/ws/telemetry)
                                |
                                v
                         REACT DASHBOARD
```

---

## ▓▓ 02 // PROVENANCE & STATUS LEGEND

To maintain rigorous scientific and engineering integrity, all capabilities in Vibro-AI are explicitly classified:

| CLASSIFICATION | DEFINITION IN VIBRO-AI |
|:---|:---|
| **IMPLEMENTED** | Complete, executable code tested by automated test suites in this repository (e.g. Radix-2 FFT, Random Forest inference, FastAPI endpoints, WebSocket streaming, SQLite/PostgreSQL persistence). |
| **SYNTHETIC / SIMULATED** | Signals and telemetry generated through deterministic physics and kinematic equations for testbench demonstration (e.g. 512-sample vibration bursts, Rotax 912 cruise telemetry). |
| **PROTOTYPE ESTIMATE** | Non-certified engineering decision-support approximations (e.g. Remaining Useful Life cycle estimate, mission readiness evaluation). Not certified by FAA, EASA, or DRDO for autonomous flight clearance. |
| **VALIDATED** | Verified through held-out cross-validation or integration tests in the test suite (`pytest`, `playwright`, `curl`). |

---

## ▓▓ 03 // REAL MACHINE LEARNING: RANDOM FOREST CLASSIFIER

Rather than claiming unverified deep neural networks, Vibro-AI implements, trains, and evaluates a **genuine Random Forest Classifier** using `scikit-learn`:

### Dataset Generation (`backend/scripts/generate_dataset.py`)
- **Total Samples:** 900 synthetic vibration bursts (512 samples at 1024 Hz each).
- **Class Balance:** Exactly 150 samples per class across 6 target categories.
- **Variation:** Parameterized rotational speed (3,300–3,700 RPM), noise ratios, impact ringing amplitudes, and load-zone modulation.
- **Leakage Prevention:** Grouped seed assignment ensuring train and test sets originate from independent random parameter families.
- **DSP Feature Extraction:** Every raw continuous signal is processed by the authoritative backend DSP engine (`backend/app/services/vibration_service.py`) extracting **24 exact features**:
  - Time moments: RMS, Peak, Peak-to-Peak, Crest Factor, Kurtosis, Skewness, Mean, StdDev.
  - Spectral & kinematic indicators: Dominant Frequency, Spectral Energy, 1X, 2X, 4X Harmonics, BPFO Band Energy, BSF Band Energy, High-Frequency Energy Ratio.
  - Sub-band decomposition: 8 uniform spectral band energies (Band 1 through Band 8).

### 6 Target Mechanical Fault Classes
1. `HEALTHY` — Nominal baseline shaft rotational harmonics + stochastic background noise.
2. `BEARING_OUTER_RACE` — Ball Pass Frequency Outer-Race (BPFO ~150 Hz) impact shocks with 1.2 kHz resonant structural ringing.
3. `BEARING_INNER_RACE` — Ball Pass Frequency Inner-Race (BPFI ~210 Hz) impacts modulated by fundamental shaft rotation (60 Hz).
4. `ROLLING_ELEMENT_DEFECT` — Ball Spin Frequency (BSF ~80 Hz) impacts modulated by cage train frequency (FTF ~24 Hz).
5. `PISTON_SLAP` — Lateral thrust reversals at 0.5X engine speed (30 Hz) with high impulsive kurtosis.
6. `VALVE_LASH` — Camshaft speed impacts (30 Hz) coupled with 4X valve train harmonics (240 Hz).

### Actual Measured Held-Out Evaluation (`backend/scripts/train_model.py`)
Evaluated strictly on a 20% held-out test set (180 unseen test samples):

```
Training Samples: 720  │  Held-Out Test Samples: 180  │  Features: 24  │  Estimators: 100
```

| METRIC | MEASURED VALUE | EVALUATION SCOPE |
|:---|:---:|:---|
| **Accuracy** | **89.44%** | Held-out test set (unseen seeds) |
| **Precision (Macro)** | **89.55%** | Equal unweighted class average |
| **Recall (Macro)** | **89.44%** | Equal unweighted class average |
| **F1-Score (Macro)** | **89.15%** | Equal unweighted harmonic mean |
| **Precision (Weighted)** | **89.55%** | Sample-weighted average |
| **Recall (Weighted)** | **89.44%** | Sample-weighted average |
| **F1-Score (Weighted)** | **89.15%** | Sample-weighted average |

### Confusion Matrix (Held-Out Test Set)

```
                       Predicted Class
               HEA   BOR   BIR   RED   PIS   VAL
Actual Class
HEALTHY         30     0     0     0     0     0
BEARING_OUTER    0    22     8     0     0     0
BEARING_INNER    8     3    19     0     0     0
ROLLING_ELEM     0     0     0    30     0     0
PISTON_SLAP      0     0     0     0    30     0
VALVE_LASH       0     0     0     0     0    30
```

*Note: Classes with kinematic defect overlap (outer race vs inner race) exhibit realistic confusion boundaries, validating that the evaluation represents genuine held-out machine learning without overfitted artificial separation.*

- **Model Artifact:** `backend/models/fault_classifier.pkl`
- **Metadata & Evaluation Report:** `backend/models/model_metadata.json`

---

## ▓▓ 04 // SENSOR FAILURE & DC DRIFT ISOLATION

A critical weakness in naive vibration monitoring is false alarm generation when an accelerometer transducer undergoes DC bias drift. Vibro-AI solves this through **Sensor Failure Isolation**:

```
NORMAL STATE
     ↓
ACCELEROMETER DC DRIFT (+1.15g offset)
     ↓
DSP DETECTS STATIC MEAN OFFSET WITHOUT BEARING RINGING (BPFO < 15.0, Kurtosis < 3.3)
     ↓
SYSTEM FLAGS: "SENSOR DC BIAS DRIFT DETECTED" (Severity: WATCH)
     ↓
SYSTEM DOES NOT CLAIM BEARING MECHANICAL FAILURE
     ↓
RECOMMENDED ACTION: Recalibrate accelerometer at turnaround. No engine maintenance required.
```

---

## ▓▓ 05 // REAL-TIME WEBSOCKET STREAMING & API

The FastAPI backend exposes a dedicated WebSocket endpoint that streams synchronized telemetry, raw vibration waveforms, and hybrid intelligence state to the frontend:

- **WebSocket Endpoint:** `ws://127.0.0.1:8000/ws/telemetry` (or `wss://<render-backend>/ws/telemetry`)
- **Streaming Frequency:** Practical ~12.5 Hz rate (avoids database flooding).
- **Bidirectional Control:** The browser can send scenario control commands:
  - `{"action": "set_scenario", "scenario": "EARLY_BEARING_WEAR"}`
  - `{"action": "set_phase", "phase": "TAKEOFF"}`
  - `{"action": "ping"}` $\to$ `{"type": "pong"}`

### REST API Endpoints

| METHOD | ROUTE | DESCRIPTION |
|:---|:---|:---|
| `GET` | `/health` | Lightweight service health check |
| `GET` | `/api/engines` | Roster of monitored engines / UAVs |
| `GET` | `/api/engines/{id}/digital-twin` | Comprehensive Digital Twin state across all 6 subsystems |
| `GET` | `/api/simulation/state` | Current simulation frame and intelligence diagnosis |
| `POST` | `/api/simulation/scenario` | Switch active server-owned demo scenario |
| `POST` | `/api/simulation/phase` | Switch active flight phase (Takeoff, Climb, Cruise, Landing) |
| `GET` | `/api/simulation/system-trace` | 8-stage end-to-end engineering trace payload |
| `GET` | `/api/engines/{id}/faults` | Active and historical fault event records |
| `GET` | `/api/engines/{id}/maintenance/advisories` | Actionable maintenance work orders |

---

## ▓▓ 06 // JUDGE-FACING 8-STAGE SYSTEM TRACE

A key visual feature on the Command Center is the **End-to-End System Trace**, allowing evaluators to trace the complete chain of causality in real time:

1. **`[SENSOR]`** — Accelerometer signal acquisition (512 samples @ 1024 Hz).
2. **`[DSP]`** — FFT spectrum, dominant frequency (60 Hz), kurtosis, crest factor, sub-band partitioning.
3. **`[INTELLIGENCE]`** — Hybrid multi-evidence synthesis (Random Forest ML + physics baseline).
4. **`[HEALTH]`** — Subsystem health score aggregation (0–100%).
5. **`[RUL]`** — Prototype operating margin estimate (operating cycles remaining).
6. **`[DIGITAL TWIN]`** — Subsystem spatial state mapping (Bearing, Crankcase, Fuel...).
7. **`[MISSION]`** — Mission-phase risk rating (e.g. Critical during Takeoff vs Elevated in Cruise).
8. **`[DECISION SUPPORT]`** — Actionable maintenance order and checklist.

---

## ▓▓ 07 // LOCAL TESTING & VERIFICATION

### 1. Run Complete Backend Test Suite (97 Tests)
```bash
cd backend
./.venv/bin/pytest
```
*Expected result: 97 passed in ~3.5s.*

### 2. Run End-to-End Vertical Slice Test
```bash
./backend/.venv/bin/pytest backend/tests/test_vertical_slice_e2e.py
```
*Validates signal generation $\to$ DSP $\to$ ML inference $\to$ health degradation $\to$ RUL $\to$ Digital Twin $\to$ WebSocket stream.*

### 3. Build React Frontend
```bash
npm run build
```
*Compiles TypeScript and Vite production bundle with zero errors.*

### 4. Start Local Full-Stack Development
```bash
# Terminal 1: FastAPI Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: React Frontend
npm run dev
```
Open `http://localhost:5173` in your browser. The header badge will show **`TWIN API`** indicating live connection to the FastAPI backend.

---

## ▓▓ 08 // DEPLOYMENT ARCHITECTURE

| COMPONENT | HOSTING PLATFORM | RUNTIME ENVIRONMENT | URL |
|:---|:---|:---|:---|
| **Frontend** | **Vercel** | Static Edge CDN (React 19 / Vite SPA) | [https://vibro-ai-main.vercel.app](https://vibro-ai-main.vercel.app) |
| **Backend** | **Render** | Persistent Python 3.12 Web Service | `https://<render-backend-url>` |

### Render Backend Configuration
- **Repository:** `mmuthuselvam298/Vibro-AI`
- **Root Directory:** `backend`
- **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt && python scripts/train_model.py`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/health`
- **Environment Variables:**
  - `PORT`: `8000`
  - `PYTHON_VERSION`: `3.12.8`
  - `CORS_ORIGINS`: `https://vibro-ai-main.vercel.app,http://localhost:5173`
  - `DATABASE_URL`: (Optional PostgreSQL connection string; defaults to SQLite)

### Vercel Frontend Environment Variables
- `VITE_API_BASE_URL`: `https://<your-render-backend-url>`
- `VITE_WS_BASE_URL`: `wss://<your-render-backend-url>`

---

## ▓▓ 09 // RESEARCH & PROTOTYPE DISCLAIMER

This software is developed as an engineering prototype for the **Smart India Hackathon 2026** (Problem Statement: SIH26054). 
1. Simulated vibration waveforms and synthetic telemetry are generated from empirical kinematic models and do not represent OEM flight data from certified commercial or military aircraft.
2. Prognostic Remaining Useful Life (RUL) estimates and mission readiness evaluations represent configurable decision-support heuristics and must not be utilized for autonomous flight clearance or airworthiness certification without physical bench testing and regulatory validation.
