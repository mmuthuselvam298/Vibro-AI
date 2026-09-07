/**
 * VIBRO-AI FUSION - Adaptive Physics Baseline Engine (SIH26054)
 * 
 * First-Principles Physics & Operating Envelope Model:
 * "We don't wait for a parameter to become dangerous.
 *  We detect when the engine stops behaving like a healthy engine."
 * 
 * The healthy baseline is dynamically computed as:
 *   EXPECTED HEALTHY STATE = f(RPM, load, mission profile, environment, flight phase)
 */

import type { MissionProfileType } from '@/store/engineStore';

export type DeviationStatus = 'NORMAL' | 'WATCH' | 'ANOMALY' | 'CRITICAL';

export interface BaselineParamResult {
  expected: number;
  current: number;
  residual: number; // current - expected
  deviationPercent: number; // ((current - expected) / expected) * 100
  absDeviationPercent: number;
  status: DeviationStatus;
  unit: string;
  nominalMin: number;
  nominalMax: number;
  label: string;
  physicsContext: string;
}

export interface AdaptiveBaselineResult {
  overallDeviationScore: number; // 0 - 100%
  overallStatus: DeviationStatus;
  parameters: {
    vibrationRms: BaselineParamResult;
    rpm: BaselineParamResult;
    oilPressure: BaselineParamResult;
    oilTemp: BaselineParamResult;
    cht: BaselineParamResult;
    egt: BaselineParamResult;
    fuelFlow: BaselineParamResult;
  };
  environmentalOffsets: {
    ambientTempOffset: number; // °C
    airDensityFactor: number; // ratio
    throttleTransientFactor: number; // ratio
    activeProfileDescription: string;
  };
}

/**
 * Computes the adaptive healthy reference baseline and per-parameter residuals
 * based on current telemetry, flight phase, and environmental mission profile.
 */
export function computeAdaptiveBaseline(
  currentTelemetry: {
    rpm: number;
    cht: number;
    egt: number;
    oilPressure: number;
    oilTemp: number;
    fuelFlow: number;
    vibrationRms: number;
  },
  missionProfile: MissionProfileType,
  loadRatio: number = 0.75 // 75% cruise power by default
): AdaptiveBaselineResult {
  // 1. Environmental & Operational Modifiers based on Mission Profile
  let ambientTempOffset = 0; // standard ISA 15°C
  let airDensityFactor = 1.0; // standard MSL density
  let throttleTransientFactor = 1.0;
  let profileDescription = 'Standard ISA Atmospheric Conditions (15°C, MSL)';

  switch (missionProfile) {
    case 'HOT_WEATHER':
      ambientTempOffset = 30; // +30°C (45°C ambient desert/tactical takeoff)
      airDensityFactor = 0.92;
      profileDescription = 'High Ambient Temperature (+45°C Tactical Operational Envelope)';
      break;

    case 'HIGH_ALTITUDE':
      ambientTempOffset = -25; // cold high altitude (-10°C)
      airDensityFactor = 0.68; // 15,000 ft operational ceiling
      profileDescription = 'High Altitude / Low Air Density Envelope (FL150 Thin Air)';
      break;

    case 'RAPID_THROTTLE':
      throttleTransientFactor = 1.45; // allows dynamic acceleration transients
      profileDescription = 'Dynamic High-G Maneuver & Rapid Throttle Transients';
      break;

    case 'ENDURANCE_CRUISE':
    default:
      ambientTempOffset = 0;
      airDensityFactor = 1.0;
      profileDescription = 'Endurance Cruise Standard Operating Envelope (3,600 RPM)';
      break;
  }

  // 2. First-Principles Expected Healthy Reference Values
  // Expected RPM is driven by the mission profile demand
  let expectedRpm = 3600;
  if (missionProfile === 'HIGH_ALTITUDE') expectedRpm = 3750; // governor increases pitch/speed to maintain airspeed
  if (missionProfile === 'HOT_WEATHER') expectedRpm = 3580;

  // Expected CHT: f(load, ambientTemp, cooling airflow)
  // Baseline ISA cruise: 152°C. In hot weather, +16°C is physically expected and healthy!
  let expectedCht = 152 + (ambientTempOffset * 0.55) + ((loadRatio - 0.75) * 40);
  if (missionProfile === 'HIGH_ALTITUDE') expectedCht += 6; // reduced air mass flow through cowling

  // Expected EGT: f(air-fuel equivalence ratio, ambient density, load)
  // Baseline ISA cruise: 710°C. In thin air, mixture naturally shifts, expected EGT is 730°C
  let expectedEgt = 710 + ((1.0 - airDensityFactor) * 62) + ((loadRatio - 0.75) * 50);

  // Expected Oil Temperature: f(ambient temp, engine heat generation, oil cooler efficiency)
  // Baseline ISA cruise: 88°C. In hot weather, expected oil temp rises to ~96°C
  let expectedOilTemp = 88 + (ambientTempOffset * 0.28) + ((loadRatio - 0.75) * 20);

  // Expected Oil Pressure: Positive displacement pump f(RPM, oil viscosity/temp)
  // Higher oil temperature reduces dynamic viscosity, slightly reducing line pressure
  const viscosityFactor = 1.0 - (Math.max(0, expectedOilTemp - 88) * 0.0035);
  let expectedOilPressure = 4.6 * (expectedRpm / 3600) * viscosityFactor;

  // Expected Fuel Consumption (BSFC map): f(density, load)
  // High altitude leans fuel flow from 17.8 to ~16.2 L/h
  let expectedFuelFlow = 17.8 * airDensityFactor * (loadRatio / 0.75);

  // Expected Vibration RMS: ISO 10816 baseline rotor dynamic unbalance
  // Cruise unbalance baseline: 0.85g. Rapid throttle transients temporarily allow up to 1.25g
  let expectedVibrationRms = 0.85 * (expectedRpm / 3600) * (throttleTransientFactor > 1 ? 1.25 : 1.0);

  // Round expected values to realistic sensor resolutions
  expectedRpm = Math.round(expectedRpm);
  expectedCht = Number(expectedCht.toFixed(1));
  expectedEgt = Number(expectedEgt.toFixed(1));
  expectedOilTemp = Number(expectedOilTemp.toFixed(1));
  expectedOilPressure = Number(expectedOilPressure.toFixed(2));
  expectedFuelFlow = Number(expectedFuelFlow.toFixed(1));
  expectedVibrationRms = Number(expectedVibrationRms.toFixed(2));

  // 3. Helper to Calculate Individual Parameter Deviation & Status
  const evaluateParam = (
    current: number,
    expected: number,
    unit: string,
    nominalMin: number,
    nominalMax: number,
    label: string,
    physicsContext: string,
    criticalDevThreshold: number = 50,
    anomalyDevThreshold: number = 25,
    watchDevThreshold: number = 10
  ): BaselineParamResult => {
    const residual = Number((current - expected).toFixed(2));
    const rawDev = expected !== 0 ? ((current - expected) / expected) * 100 : 0;
    const deviationPercent = Number(rawDev.toFixed(1));
    const absDev = Math.abs(deviationPercent);

    let status: DeviationStatus = 'NORMAL';
    if (absDev >= criticalDevThreshold) {
      status = 'CRITICAL';
    } else if (absDev >= anomalyDevThreshold) {
      status = 'ANOMALY';
    } else if (absDev >= watchDevThreshold) {
      status = 'WATCH';
    }

    return {
      expected,
      current,
      residual,
      deviationPercent,
      absDeviationPercent: absDev,
      status,
      unit,
      nominalMin,
      nominalMax,
      label,
      physicsContext,
    };
  };

  const vibrationRmsResult = evaluateParam(
    currentTelemetry.vibrationRms,
    expectedVibrationRms,
    'g',
    0.5,
    2.5,
    'Vibration RMS',
    'ISO 10816 mechanical baseline rotor-bearing kinematic energy',
    50, // Critical if >50% deviation
    25, // Anomaly if >25% deviation
    12  // Watch if >12% deviation
  );

  const rpmResult = evaluateParam(
    currentTelemetry.rpm,
    expectedRpm,
    'RPM',
    2800,
    4200,
    'Engine Speed (RPM)',
    'Governor speed-stability & rotational kinetic balance',
    15,
    8,
    4
  );

  const oilPressureResult = evaluateParam(
    currentTelemetry.oilPressure,
    expectedOilPressure,
    'bar',
    3.5,
    6.0,
    'Oil Hydrostatic Pressure',
    'Positive displacement pump hydraulic curve f(RPM, Oil Temp)',
    25,
    15,
    8
  );

  const oilTempResult = evaluateParam(
    currentTelemetry.oilTemp,
    expectedOilTemp,
    '°C',
    70,
    115,
    'Oil Sump Temperature',
    'Journal friction heat generation vs cooler thermal dissipation',
    20,
    10,
    5
  );

  const chtResult = evaluateParam(
    currentTelemetry.cht,
    expectedCht,
    '°C',
    120,
    200,
    'Cylinder Head Temp (CHT)',
    'Cylinder head thermodynamic dissipation model f(RPM, Load, Ambient)',
    20,
    10,
    5
  );

  const egtResult = evaluateParam(
    currentTelemetry.egt,
    expectedEgt,
    '°C',
    600,
    850,
    'Exhaust Gas Temp (EGT)',
    'Stoichiometric combustion enthalpy & exhaust manifold gas balance',
    18,
    10,
    5
  );

  const fuelFlowResult = evaluateParam(
    currentTelemetry.fuelFlow,
    expectedFuelFlow,
    'L/h',
    12.0,
    26.0,
    'Fuel Consumption Rate',
    'Brake Specific Fuel Consumption (BSFC) speed-density map',
    25,
    15,
    8
  );

  // 4. Overall Deviation Score: Weighted Root Mean Square of Deviations
  // Primary mechanical fingerprint is Vibration RMS (weight 0.35)
  // Supporting thermodynamic & hydraulic sensors (weights 0.10 - 0.15)
  const weightedSumSq =
    Math.pow(Math.min(100, vibrationRmsResult.absDeviationPercent), 2) * 0.35 +
    Math.pow(Math.min(100, oilPressureResult.absDeviationPercent * 2), 2) * 0.18 +
    Math.pow(Math.min(100, oilTempResult.absDeviationPercent * 2), 2) * 0.14 +
    Math.pow(Math.min(100, chtResult.absDeviationPercent * 2), 2) * 0.13 +
    Math.pow(Math.min(100, egtResult.absDeviationPercent * 2), 2) * 0.10 +
    Math.pow(Math.min(100, fuelFlowResult.absDeviationPercent * 1.5), 2) * 0.06 +
    Math.pow(Math.min(100, rpmResult.absDeviationPercent * 3), 2) * 0.04;

  const overallDeviationScore = Number(Math.min(100, Math.sqrt(weightedSumSq)).toFixed(1));

  let overallStatus: DeviationStatus = 'NORMAL';
  if (overallDeviationScore >= 50) {
    overallStatus = 'CRITICAL';
  } else if (overallDeviationScore >= 25) {
    overallStatus = 'ANOMALY';
  } else if (overallDeviationScore >= 10) {
    overallStatus = 'WATCH';
  }

  return {
    overallDeviationScore,
    overallStatus,
    parameters: {
      vibrationRms: vibrationRmsResult,
      rpm: rpmResult,
      oilPressure: oilPressureResult,
      oilTemp: oilTempResult,
      cht: chtResult,
      egt: egtResult,
      fuelFlow: fuelFlowResult,
    },
    environmentalOffsets: {
      ambientTempOffset,
      airDensityFactor,
      throttleTransientFactor,
      activeProfileDescription: profileDescription,
    },
  };
}
