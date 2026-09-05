import { create } from 'zustand';

export type ScenarioType =
  | 'HEALTHY'
  | 'EARLY_BEARING_WEAR'
  | 'SEVERE_BEARING_WEAR'
  | 'PISTON_SLAP'
  | 'VALVE_LASH'
  | 'ROLLING_ELEMENT_DEFECT'
  | 'MISFIRE'
  | 'INJECTOR_ABNORMALITY'
  | 'LUBRICATION_ISSUE'
  | 'OVERHEATING'
  | 'SENSOR_DRIFT'
  | 'COMBUSTION_INSTABILITY';

export type SeverityType = 'NOMINAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ComponentType = 'NONE' | 'BEARING' | 'PISTON' | 'VALVE' | 'ROLLING_ELEMENT' | 'FUEL_INJECTOR' | 'OIL_SYSTEM' | 'COOLING_SYSTEM' | 'SENSOR_ADXL';
export type MissionProfileType = 'ENDURANCE_CRUISE' | 'HIGH_ALTITUDE' | 'HOT_WEATHER' | 'RAPID_THROTTLE';
export type DataModeType = 'SIMULATION' | 'LIVE_HARDWARE_STREAM';

export interface TelemetryParam {
  current: number;
  expected: number;
  unit: string;
  nominalMin: number;
  nominalMax: number;
  label: string;
  role: string;
  guideSection: string;
}

export interface TelemetryState {
  rpm: TelemetryParam;
  cht: TelemetryParam;
  egt: TelemetryParam;
  oilPressure: TelemetryParam;
  oilTemp: TelemetryParam;
  fuelFlow: TelemetryParam;
  vibrationRms: TelemetryParam;
  batteryVoltage: TelemetryParam;
  injectionTiming: TelemetryParam;
}

export interface ScenarioDetail {
  engineHealth: number; // 0-100
  faultType: string;
  severity: SeverityType;
  confidence: number; // 0-100
  rul: number; // remaining useful life in cycles
  degradationRate: number; // % health loss per 100 cycles
  affectedComponent: ComponentType;
  alertStatus: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  fusionSummary: string;
  maintenanceAction: string;
  maintenanceUrgency: 'NONE' | 'NEXT_SCHEDULED' | 'WITHIN_20_CYCLES' | 'IMMEDIATE_GROUND';
  telemetryBase: {
    rpm: { current: number; expected: number };
    cht: { current: number; expected: number };
    egt: { current: number; expected: number };
    oilPressure: { current: number; expected: number };
    oilTemp: { current: number; expected: number };
    fuelFlow: { current: number; expected: number };
    vibrationRms: { current: number; expected: number };
    batteryVoltage: { current: number; expected: number };
    injectionTiming: { current: number; expected: number };
  };
  evidencePoints: string[];
}

export interface EngineState {
  scenario: ScenarioType;
  engineHealth: number;
  faultType: string;
  severity: SeverityType;
  confidence: number;
  rul: number;
  degradationRate: number;
  affectedComponent: ComponentType;
  inferenceLatency: number;
  operatingCycle: number;
  alertStatus: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  fusionSummary: string;
  maintenanceAction: string;
  maintenanceUrgency: 'NONE' | 'NEXT_SCHEDULED' | 'WITHIN_20_CYCLES' | 'IMMEDIATE_GROUND';
  evidencePoints: string[];

  // Telemetry & Residuals
  telemetry: TelemetryState;

  // Mission & Data Mode
  missionProfile: MissionProfileType;
  dataMode: DataModeType;
  missionTimeSeconds: number;
  missionTotalDuration: number;
  isSimulating: boolean;
  replaySpeed: number;

  // Actions
  setScenario: (scenario: ScenarioType) => void;
  setMissionProfile: (profile: MissionProfileType) => void;
  setDataMode: (mode: DataModeType) => void;
  setMissionTimeSeconds: (time: number) => void;
  setReplaySpeed: (speed: number) => void;
  toggleSimulation: () => void;
  tick: () => void;
}

const scenarioDefinitions: Record<ScenarioType, ScenarioDetail> = {
  HEALTHY: {
    engineHealth: 96.5,
    faultType: 'None (Nominal Operation)',
    severity: 'NOMINAL',
    confidence: 99.4,
    rul: 185,
    degradationRate: 0.12,
    affectedComponent: 'NONE',
    alertStatus: 'NOMINAL',
    fusionSummary: 'All 9 telemetry streams align with baseline physics model. Zero residual anomaly detected.',
    maintenanceAction: 'Routine turnaround inspection at 200 cycles. No corrective maintenance required.',
    maintenanceUrgency: 'NONE',
    evidencePoints: [
      'Multi-sensor residuals within ±1.5% nominal variance',
      'Vibration RMS 0.85g at nominal 3,600 RPM baseline',
      'Cylinder Head Temperature (CHT) 152°C vs 152°C expected (Δ0°C)',
      'Gaussian vibration amplitude distribution (Kurtosis: 3.02)'
    ],
    telemetryBase: {
      rpm: { current: 3600, expected: 3600 },
      cht: { current: 152, expected: 152 },
      egt: { current: 710, expected: 710 },
      oilPressure: { current: 4.6, expected: 4.6 },
      oilTemp: { current: 88, expected: 88 },
      fuelFlow: { current: 17.8, expected: 17.8 },
      vibrationRms: { current: 0.85, expected: 0.85 },
      batteryVoltage: { current: 28.2, expected: 28.2 },
      injectionTiming: { current: 28.0, expected: 28.0 }
    }
  },
  EARLY_BEARING_WEAR: {
    engineHealth: 74.0,
    faultType: 'Bearing Outer-Race Spalling (BPFO)',
    severity: 'MEDIUM',
    confidence: 86.8,
    rul: 88,
    degradationRate: 0.58,
    affectedComponent: 'BEARING',
    alertStatus: 'WARNING',
    fusionSummary: 'Vibration ↑ + BPFO 150Hz harmonic + RPM-normalized anomaly + minor oil temp increase confirmed.',
    maintenanceAction: 'Inspect and borescope main crank bearing outer race at next scheduled turnaround.',
    maintenanceUrgency: 'NEXT_SCHEDULED',
    evidencePoints: [
      'BPFO 150 Hz peak identified at 3,600 RPM (2.5X shaft harmonic)',
      'Vibration RMS elevated to 1.82g (+114% over baseline)',
      'Oil Temperature increased +3°C (91°C vs 88°C expected)',
      'Impulsive crest factor elevated to 4.35 with periodic shock envelope'
    ],
    telemetryBase: {
      rpm: { current: 3620, expected: 3600 },
      cht: { current: 156, expected: 152 },
      egt: { current: 715, expected: 710 },
      oilPressure: { current: 4.3, expected: 4.6 },
      oilTemp: { current: 91, expected: 88 },
      fuelFlow: { current: 18.2, expected: 17.8 },
      vibrationRms: { current: 1.82, expected: 0.85 },
      batteryVoltage: { current: 28.0, expected: 28.2 },
      injectionTiming: { current: 28.1, expected: 28.0 }
    }
  },
  SEVERE_BEARING_WEAR: {
    engineHealth: 28.5,
    faultType: 'Severe Bearing Outer-Race Flaking',
    severity: 'CRITICAL',
    confidence: 97.6,
    rul: 14,
    degradationRate: 2.85,
    affectedComponent: 'BEARING',
    alertStatus: 'CRITICAL',
    fusionSummary: 'High BPFO harmonics + Kurtosis 8.7 + Oil pressure drop (−0.5 bar) + Oil temp +12°C indicate impending seizure.',
    maintenanceAction: 'IMMEDIATE GROUNDING: Remove engine for complete main bearing teardown and replacement.',
    maintenanceUrgency: 'IMMEDIATE_GROUND',
    evidencePoints: [
      'Strong BPFO harmonics (150Hz, 300Hz, 450Hz) exceeding ISO 10816 Class IV limits',
      'Oil Pressure dropped to 4.1 bar (Expected: 4.6 bar → Δ−0.5 bar residual)',
      'Oil Temperature spiked to 100°C (Expected: 88°C → Δ+12°C residual)',
      'Severe broadband floor excitation with Kurtosis reaching 8.72'
    ],
    telemetryBase: {
      rpm: { current: 3580, expected: 3600 },
      cht: { current: 168, expected: 152 },
      egt: { current: 725, expected: 710 },
      oilPressure: { current: 4.1, expected: 4.6 },
      oilTemp: { current: 100, expected: 88 },
      fuelFlow: { current: 19.1, expected: 17.8 },
      vibrationRms: { current: 3.95, expected: 0.85 },
      batteryVoltage: { current: 27.6, expected: 28.2 },
      injectionTiming: { current: 28.4, expected: 28.0 }
    }
  },
  PISTON_SLAP: {
    engineHealth: 58.0,
    faultType: 'Piston Skirt / Cylinder Wall Slap',
    severity: 'HIGH',
    confidence: 89.4,
    rul: 52,
    degradationRate: 1.15,
    affectedComponent: 'PISTON',
    alertStatus: 'CRITICAL',
    fusionSummary: 'TDC/BDC lateral impact bursts correlated with cylinder thermal gradient (+17°C CHT residual).',
    maintenanceAction: 'Check piston-to-bore clearance on cylinder #2 and inspect cylinder wall for scuffing.',
    maintenanceUrgency: 'WITHIN_20_CYCLES',
    evidencePoints: [
      'Transient 30Hz impact bursts synchronized with piston Top/Bottom Dead Center',
      'CHT spiked to 169°C (Expected: 152°C → Δ+17°C thermal residual)',
      'Broadband acoustic emission spikes during expansion stroke',
      'High peak amplitude (4.8g) with elevated Kurtosis (11.8)'
    ],
    telemetryBase: {
      rpm: { current: 3610, expected: 3600 },
      cht: { current: 169, expected: 152 },
      egt: { current: 730, expected: 710 },
      oilPressure: { current: 4.4, expected: 4.6 },
      oilTemp: { current: 94, expected: 88 },
      fuelFlow: { current: 18.9, expected: 17.8 },
      vibrationRms: { current: 2.65, expected: 0.85 },
      batteryVoltage: { current: 28.1, expected: 28.2 },
      injectionTiming: { current: 28.2, expected: 28.0 }
    }
  },
  VALVE_LASH: {
    engineHealth: 76.5,
    faultType: 'Excessive Exhaust Valve Lash Gap',
    severity: 'MEDIUM',
    confidence: 83.7,
    rul: 105,
    degradationRate: 0.45,
    affectedComponent: 'VALVE',
    alertStatus: 'WARNING',
    fusionSummary: 'Valve closure seating impact + 4X shaft harmonic growth + minor EGT elevation detected.',
    maintenanceAction: 'Adjust tappet clearance on exhaust valve #1 to nominal 0.25mm spec.',
    maintenanceUrgency: 'NEXT_SCHEDULED',
    evidencePoints: [
      'High-frequency mechanical seating transients at 30Hz valve event rate',
      '4th order shaft harmonic growth (240Hz energy amplification)',
      'EGT elevated to 738°C (Expected: 710°C → Δ+28°C residual)',
      'Repeatable train-end impact signature in Wavelet Packet sub-band 4'
    ],
    telemetryBase: {
      rpm: { current: 3595, expected: 3600 },
      cht: { current: 155, expected: 152 },
      egt: { current: 738, expected: 710 },
      oilPressure: { current: 4.5, expected: 4.6 },
      oilTemp: { current: 89, expected: 88 },
      fuelFlow: { current: 18.4, expected: 17.8 },
      vibrationRms: { current: 1.75, expected: 0.85 },
      batteryVoltage: { current: 28.2, expected: 28.2 },
      injectionTiming: { current: 28.0, expected: 28.0 }
    }
  },
  ROLLING_ELEMENT_DEFECT: {
    engineHealth: 42.0,
    faultType: 'Rolling Element (Ball/Roller) Defect (BSF)',
    severity: 'HIGH',
    confidence: 91.8,
    rul: 32,
    degradationRate: 1.80,
    affectedComponent: 'ROLLING_ELEMENT',
    alertStatus: 'CRITICAL',
    fusionSummary: 'BSF 80Hz modulated by cage FTF 24Hz + oil temperature +8°C confirm bearing element spall.',
    maintenanceAction: 'Schedule immediate bearing assembly swap; check oil filter for metallic particulate.',
    maintenanceUrgency: 'WITHIN_20_CYCLES',
    evidencePoints: [
      'Ball Spin Frequency (BSF ~80Hz) amplitude spikes modulated by FTF (~24Hz)',
      'Vibration RMS elevated to 2.45g with impulsive crest factor 5.4',
      'Oil Temperature increased to 96°C (Expected: 88°C → Δ+8°C residual)',
      'High-frequency envelope demodulation confirms roller surface pitting'
    ],
    telemetryBase: {
      rpm: { current: 3605, expected: 3600 },
      cht: { current: 158, expected: 152 },
      egt: { current: 712, expected: 710 },
      oilPressure: { current: 4.2, expected: 4.6 },
      oilTemp: { current: 96, expected: 88 },
      fuelFlow: { current: 18.1, expected: 17.8 },
      vibrationRms: { current: 2.45, expected: 0.85 },
      batteryVoltage: { current: 28.0, expected: 28.2 },
      injectionTiming: { current: 28.0, expected: 28.0 }
    }
  },
  MISFIRE: {
    engineHealth: 48.0,
    faultType: 'Intermittent Cylinder Misfire (Cyl #3)',
    severity: 'HIGH',
    confidence: 93.2,
    rul: 40,
    degradationRate: 1.65,
    affectedComponent: 'FUEL_INJECTOR',
    alertStatus: 'CRITICAL',
    fusionSummary: 'Sudden EGT drop (−85°C) + RPM fluctuation + 0.5X sub-harmonic torque ripple signature.',
    maintenanceAction: 'Inspect spark ignition harness and injector coil on cylinder #3; perform compression test.',
    maintenanceUrgency: 'WITHIN_20_CYCLES',
    evidencePoints: [
      'Exhaust Gas Temp (EGT) plummeted to 625°C (Expected: 710°C → Δ−85°C residual)',
      'RPM instability with ±120 RPM periodic torsional fluctuation',
      'Half-order (0.5X = 30Hz) rotational vibration peak from unburned power stroke',
      'Unburned fuel causing secondary exhaust manifold oxidation'
    ],
    telemetryBase: {
      rpm: { current: 3480, expected: 3600 },
      cht: { current: 138, expected: 152 },
      egt: { current: 625, expected: 710 },
      oilPressure: { current: 4.4, expected: 4.6 },
      oilTemp: { current: 86, expected: 88 },
      fuelFlow: { current: 19.8, expected: 17.8 },
      vibrationRms: { current: 2.90, expected: 0.85 },
      batteryVoltage: { current: 27.4, expected: 28.2 },
      injectionTiming: { current: 29.5, expected: 28.0 }
    }
  },
  INJECTOR_ABNORMALITY: {
    engineHealth: 62.0,
    faultType: 'Fuel Injector Clogging / Timing Deviation',
    severity: 'MEDIUM',
    confidence: 87.5,
    rul: 68,
    degradationRate: 0.85,
    affectedComponent: 'FUEL_INJECTOR',
    alertStatus: 'WARNING',
    fusionSummary: 'Injection timing retarded (+2.4° BTDC) + Fuel flow ↑ + uneven EGT distribution detected.',
    maintenanceAction: 'Flow-test and ultrasonic clean fuel injection nozzles; recalibrate ECU fuel trim table.',
    maintenanceUrgency: 'NEXT_SCHEDULED',
    evidencePoints: [
      'Injection Timing offset to 30.4° BTDC (Expected: 28.0° → Δ+2.4° deviation)',
      'Fuel Flow increased to 20.6 L/h (Expected: 17.8 L/h → Δ+2.8 L/h residual)',
      'EGT elevated to 755°C from lean/late combustion cycle',
      'Acoustic emission timing jitter detected in sensor fusion pipeline'
    ],
    telemetryBase: {
      rpm: { current: 3590, expected: 3600 },
      cht: { current: 164, expected: 152 },
      egt: { current: 755, expected: 710 },
      oilPressure: { current: 4.5, expected: 4.6 },
      oilTemp: { current: 90, expected: 88 },
      fuelFlow: { current: 20.6, expected: 17.8 },
      vibrationRms: { current: 1.60, expected: 0.85 },
      batteryVoltage: { current: 27.9, expected: 28.2 },
      injectionTiming: { current: 30.4, expected: 28.0 }
    }
  },
  LUBRICATION_ISSUE: {
    engineHealth: 35.0,
    faultType: 'Low Lubrication Pressure / Oil Degradation',
    severity: 'CRITICAL',
    confidence: 96.1,
    rul: 18,
    degradationRate: 2.40,
    affectedComponent: 'OIL_SYSTEM',
    alertStatus: 'CRITICAL',
    fusionSummary: 'Oil pressure drop (−1.4 bar) + Oil temp spike (+24°C) + broadband metal friction vibration.',
    maintenanceAction: 'EMERGENCY SHUTDOWN / ABORT: Check oil pump relief valve, scavenge filter, and oil cooler line.',
    maintenanceUrgency: 'IMMEDIATE_GROUND',
    evidencePoints: [
      'Oil Pressure collapsed to 3.2 bar (Expected: 4.6 bar → Δ−1.4 bar critical residual)',
      'Oil Temperature soared to 112°C (Expected: 88°C → Δ+24°C residual)',
      'High-frequency hydrodynamic friction noise (>1.5 kHz) elevated by +18 dB',
      'Synchronous rise in CHT to 178°C due to boundary lubrication breakdown'
    ],
    telemetryBase: {
      rpm: { current: 3550, expected: 3600 },
      cht: { current: 178, expected: 152 },
      egt: { current: 735, expected: 710 },
      oilPressure: { current: 3.2, expected: 4.6 },
      oilTemp: { current: 112, expected: 88 },
      fuelFlow: { current: 18.6, expected: 17.8 },
      vibrationRms: { current: 3.20, expected: 0.85 },
      batteryVoltage: { current: 27.8, expected: 28.2 },
      injectionTiming: { current: 28.1, expected: 28.0 }
    }
  },
  OVERHEATING: {
    engineHealth: 38.0,
    faultType: 'Thermal Runaway / Cooling System Failure',
    severity: 'CRITICAL',
    confidence: 95.8,
    rul: 22,
    degradationRate: 2.10,
    affectedComponent: 'COOLING_SYSTEM',
    alertStatus: 'CRITICAL',
    fusionSummary: 'CHT 194°C (+42°C residual) + EGT 810°C (+100°C) with thermal expansion friction signatures.',
    maintenanceAction: 'Reduce throttle immediately to idle; land at nearest diversion airstrip; inspect cooling shroud.',
    maintenanceUrgency: 'IMMEDIATE_GROUND',
    evidencePoints: [
      'CHT critical threshold exceeded at 194°C (Expected: 152°C → Δ+42°C residual)',
      'EGT exceeding maximum continuous rating at 810°C (Expected: 710°C → Δ+100°C)',
      'Thermal clearance loss causing secondary piston ring micro-welding friction',
      'Oil Temperature reaching thermal oxidation limit at 108°C'
    ],
    telemetryBase: {
      rpm: { current: 3570, expected: 3600 },
      cht: { current: 194, expected: 152 },
      egt: { current: 810, expected: 710 },
      oilPressure: { current: 3.8, expected: 4.6 },
      oilTemp: { current: 108, expected: 88 },
      fuelFlow: { current: 21.2, expected: 17.8 },
      vibrationRms: { current: 2.80, expected: 0.85 },
      batteryVoltage: { current: 27.5, expected: 28.2 },
      injectionTiming: { current: 28.6, expected: 28.0 }
    }
  },
  SENSOR_DRIFT: {
    engineHealth: 82.0,
    faultType: 'ADXL355 Sensor Calibration Drift (0.4g Bias)',
    severity: 'LOW',
    confidence: 88.0,
    rul: 140,
    degradationRate: 0.25,
    affectedComponent: 'SENSOR_ADXL',
    alertStatus: 'WARNING',
    fusionSummary: 'Vibration DC offset mismatch vs nominal thermodynamic state isolated by cross-sensor validation.',
    maintenanceAction: 'Run zero-g calibration routine on STM32 DAQ; verify ADXL355 mounting bolt torque.',
    maintenanceUrgency: 'NEXT_SCHEDULED',
    evidencePoints: [
      'Sensor Fusion isolates DC bias: Vibration reads 1.95g while CHT, EGT, Oil P remain perfectly nominal',
      'No harmonic or sub-harmonic spectral peaks corresponding to mechanical kinematic defect',
      'Residual discrepancy between physics model expectation and accelerometer channel',
      'Electrical bus voltage stable at 28.2V confirming sensor supply voltage integrity'
    ],
    telemetryBase: {
      rpm: { current: 3600, expected: 3600 },
      cht: { current: 152, expected: 152 },
      egt: { current: 710, expected: 710 },
      oilPressure: { current: 4.6, expected: 4.6 },
      oilTemp: { current: 88, expected: 88 },
      fuelFlow: { current: 17.8, expected: 17.8 },
      vibrationRms: { current: 1.95, expected: 0.85 },
      batteryVoltage: { current: 28.2, expected: 28.2 },
      injectionTiming: { current: 28.0, expected: 28.0 }
    }
  },
  COMBUSTION_INSTABILITY: {
    engineHealth: 54.0,
    faultType: 'Combustion Pressure Oscillation / Flame Instability',
    severity: 'HIGH',
    confidence: 90.5,
    rul: 48,
    degradationRate: 1.35,
    affectedComponent: 'FUEL_INJECTOR',
    alertStatus: 'CRITICAL',
    fusionSummary: 'High-frequency EGT cyclic fluctuation + periodic combustion knock burst + RPM surge.',
    maintenanceAction: 'Check fuel rail pressure regulator and verify octane rating / fuel blend consistency.',
    maintenanceUrgency: 'WITHIN_20_CYCLES',
    evidencePoints: [
      'Cyclic EGT oscillations (720°C - 785°C at 4.5 Hz modulation)',
      'Transient combustion pressure shockwaves (acoustic knock harmonics 1.2 kHz - 2.8 kHz)',
      'Fuel Flow hunting between 16.5 L/h and 21.0 L/h (avg 18.9 L/h)',
      'RPM hunting ±80 RPM around cruise setpoint'
    ],
    telemetryBase: {
      rpm: { current: 3640, expected: 3600 },
      cht: { current: 172, expected: 152 },
      egt: { current: 765, expected: 710 },
      oilPressure: { current: 4.4, expected: 4.6 },
      oilTemp: { current: 93, expected: 88 },
      fuelFlow: { current: 19.4, expected: 17.8 },
      vibrationRms: { current: 2.70, expected: 0.85 },
      batteryVoltage: { current: 27.9, expected: 28.2 },
      injectionTiming: { current: 29.2, expected: 28.0 }
    }
  }
};

const buildInitialTelemetry = (scenarioKey: ScenarioType): TelemetryState => {
  const base = scenarioDefinitions[scenarioKey].telemetryBase;
  return {
    rpm: {
      current: base.rpm.current,
      expected: base.rpm.expected,
      unit: 'RPM',
      nominalMin: 3200,
      nominalMax: 3800,
      label: 'Engine Speed',
      role: 'Operating-speed context',
      guideSection: '04-engine-sensors'
    },
    cht: {
      current: base.cht.current,
      expected: base.cht.expected,
      unit: '°C',
      nominalMin: 140,
      nominalMax: 175,
      label: 'Cylinder Head Temp (CHT)',
      role: 'Cylinder thermal health',
      guideSection: '04-engine-sensors'
    },
    egt: {
      current: base.egt.current,
      expected: base.egt.expected,
      unit: '°C',
      nominalMin: 680,
      nominalMax: 760,
      label: 'Exhaust Gas Temp (EGT)',
      role: 'Combustion / exhaust behavior',
      guideSection: '04-engine-sensors'
    },
    oilPressure: {
      current: base.oilPressure.current,
      expected: base.oilPressure.expected,
      unit: 'bar',
      nominalMin: 4.0,
      nominalMax: 5.2,
      label: 'Oil Pressure',
      role: 'Lubrication health',
      guideSection: '04-engine-sensors'
    },
    oilTemp: {
      current: base.oilTemp.current,
      expected: base.oilTemp.expected,
      unit: '°C',
      nominalMin: 75,
      nominalMax: 100,
      label: 'Oil Temperature',
      role: 'Lubrication / thermal condition',
      guideSection: '04-engine-sensors'
    },
    fuelFlow: {
      current: base.fuelFlow.current,
      expected: base.fuelFlow.expected,
      unit: 'L/h',
      nominalMin: 15.0,
      nominalMax: 20.0,
      label: 'Fuel Flow Rate',
      role: 'Operating / fuel condition',
      guideSection: '04-engine-sensors'
    },
    vibrationRms: {
      current: base.vibrationRms.current,
      expected: base.vibrationRms.expected,
      unit: 'g',
      nominalMin: 0.5,
      nominalMax: 1.5,
      label: 'Vibration RMS',
      role: 'Mechanical-fault evidence',
      guideSection: '06-signal-processing'
    },
    batteryVoltage: {
      current: base.batteryVoltage.current,
      expected: base.batteryVoltage.expected,
      unit: 'V',
      nominalMin: 26.5,
      nominalMax: 29.0,
      label: 'Battery / Alternator',
      role: 'Electrical system health',
      guideSection: '04-engine-sensors'
    },
    injectionTiming: {
      current: base.injectionTiming.current,
      expected: base.injectionTiming.expected,
      unit: '° BTDC',
      nominalMin: 26.0,
      nominalMax: 30.0,
      label: 'Injection Timing',
      role: 'Combustion / injection condition',
      guideSection: '04-engine-sensors'
    }
  };
};

export const useEngineStore = create<EngineState>((set) => ({
  scenario: 'HEALTHY',
  ...scenarioDefinitions.HEALTHY,
  telemetry: buildInitialTelemetry('HEALTHY'),
  missionProfile: 'ENDURANCE_CRUISE',
  dataMode: 'SIMULATION',
  missionTimeSeconds: 1420, // 23m 40s into flight
  missionTotalDuration: 7200, // 2 hours mission
  inferenceLatency: 19,
  operatingCycle: 12540,
  isSimulating: true,
  replaySpeed: 1,

  setScenario: (scenario: ScenarioType) => set(() => {
    const def = scenarioDefinitions[scenario];
    return {
      scenario,
      ...def,
      telemetry: buildInitialTelemetry(scenario),
      inferenceLatency: 18 + Math.floor(Math.random() * 8),
    };
  }),

  setMissionProfile: (missionProfile: MissionProfileType) => set(() => ({ missionProfile })),

  setDataMode: (dataMode: DataModeType) => set(() => ({ dataMode })),

  setMissionTimeSeconds: (missionTimeSeconds: number) => set(() => ({ missionTimeSeconds })),

  setReplaySpeed: (replaySpeed: number) => set(() => ({ replaySpeed })),

  toggleSimulation: () => set((state) => ({ isSimulating: !state.isSimulating })),

  tick: () => set((state) => {
    if (!state.isSimulating) return state;

    const jitter = (val: number, maxJitter: number) => {
      const delta = (Math.random() - 0.5) * maxJitter;
      return Number((val + delta).toFixed(2));
    };

    const base = scenarioDefinitions[state.scenario].telemetryBase;

    // Advance mission time
    const newMissionTime = (state.missionTimeSeconds + (0.05 * state.replaySpeed)) % state.missionTotalDuration;

    return {
      operatingCycle: state.operatingCycle + 1,
      missionTimeSeconds: newMissionTime,
      inferenceLatency: 18 + Math.floor(Math.random() * 6),
      confidence: Math.min(99.9, Math.max(50.0, jitter(state.confidence, 0.4))),
      telemetry: {
        rpm: { ...state.telemetry.rpm, current: Math.round(jitter(base.rpm.current, 15)) },
        cht: { ...state.telemetry.cht, current: jitter(base.cht.current, 0.6) },
        egt: { ...state.telemetry.egt, current: jitter(base.egt.current, 1.8) },
        oilPressure: { ...state.telemetry.oilPressure, current: jitter(base.oilPressure.current, 0.04) },
        oilTemp: { ...state.telemetry.oilTemp, current: jitter(base.oilTemp.current, 0.3) },
        fuelFlow: { ...state.telemetry.fuelFlow, current: jitter(base.fuelFlow.current, 0.15) },
        vibrationRms: { ...state.telemetry.vibrationRms, current: jitter(base.vibrationRms.current, 0.05) },
        batteryVoltage: { ...state.telemetry.batteryVoltage, current: jitter(base.batteryVoltage.current, 0.08) },
        injectionTiming: { ...state.telemetry.injectionTiming, current: jitter(base.injectionTiming.current, 0.1) },
      }
    };
  })
}));
