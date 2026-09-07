import React, { useState } from 'react';
import { useEngineStore, type TelemetryParam } from '@/store/engineStore';
import { GuideLink } from './GuideLink';
import { JargonTooltip } from './JargonTooltip';
import { cn } from '@/lib/utils';
import {
  Gauge,
  Thermometer,
  Flame,
  Droplet,
  Fuel,
  Activity,
  BatteryCharging,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon
} from 'lucide-react';

const SENSOR_EXPLANATIONS: Record<string, { plainName: string; plainDesc: string; analogy: string }> = {
  rpm: {
    plainName: 'Engine Shaft Speed',
    plainDesc: 'How fast the crankshaft is spinning. Drop in RPM under power flags mechanical drag.',
    analogy: 'The tachometer on a car dashboard.',
  },
  cht: {
    plainName: 'Cylinder Wall Heat',
    plainDesc: 'Temperature of cylinder walls. Overheating causes piston rings to expand and bind.',
    analogy: 'Taking the engine cylinder’s direct body temperature.',
  },
  egt: {
    plainName: 'Exhaust Gas Heat',
    plainDesc: 'Heat of burning gases exiting exhaust. Detects lean fuel burns or incomplete ignition.',
    analogy: 'Like holding your hand near an exhaust pipe to feel how cleanly fuel is burning.',
  },
  oilPressure: {
    plainName: 'Engine Oil Pressure',
    plainDesc: 'Hydraulic force pushing oil into bearings. If this drops, metal grinds directly on metal.',
    analogy: 'Blood pressure in arteries — if it crashes, vital parts starve immediately.',
  },
  oilTemp: {
    plainName: 'Oil Sump Temperature',
    plainDesc: 'Oil heat inside the reservoir. Excess heat thins oil so it can no longer cushion bearings.',
    analogy: 'Cooking oil overheating in a pan and losing its thickness.',
  },
  fuelFlow: {
    plainName: 'Fuel Burn Rate',
    plainDesc: 'Hourly fuel consumption rate. Spikes or drops flag injector clogging or leaks.',
    analogy: 'How fast gasoline is draining from the tank every hour.',
  },
  vibrationRms: {
    plainName: 'Total Vibration Energy',
    plainDesc: 'Overall mechanical shaking intensity. First metric to rise during bearing or rotor damage.',
    analogy: 'How hard a phone is buzzing on a wooden table.',
  },
  batteryVoltage: {
    plainName: 'Electrical Bus Voltage',
    plainDesc: 'Voltage powering ignition coils and sensor telemetry transmitters.',
    analogy: 'Car battery charge level keeping the spark plugs firing.',
  },
  injectionTiming: {
    plainName: 'Fuel Injection Angle',
    plainDesc: 'Exact crank angle when fuel spray triggers before Top Dead Center.',
    analogy: 'Timing a swing perfectly just as the ball crosses home plate.',
  },
};

export const TelemetryGrid: React.FC = () => {
  const { telemetry, dataMode, plainLanguageMode } = useEngineStore();
  const [filter, setFilter] = useState<'ALL' | 'ANOMALIES' | 'THERMAL' | 'MECHANICAL'>('ALL');

  const getParamIcon = (key: string) => {
    switch (key) {
      case 'rpm': return <Gauge size={16} />;
      case 'cht': return <Thermometer size={16} />;
      case 'egt': return <Flame size={16} />;
      case 'oilPressure': return <Droplet size={16} />;
      case 'oilTemp': return <Thermometer size={16} />;
      case 'fuelFlow': return <Fuel size={16} />;
      case 'vibrationRms': return <Activity size={16} />;
      case 'batteryVoltage': return <BatteryCharging size={16} />;
      case 'injectionTiming': return <Sparkles size={16} />;
      default: return <Layers size={16} />;
    }
  };

  const getStatus = (param: TelemetryParam) => {
    const isOutOfNominal = param.current < param.nominalMin || param.current > param.nominalMax;
    const residual = Math.abs(param.current - param.expected);
    const residualPct = param.expected ? (residual / param.expected) * 100 : 0;

    if (isOutOfNominal || residualPct > 15) {
      return {
        text: 'ANOMALY',
        badgeClass: 'bg-[var(--color-brand-red)] text-white border-black',
        icon: <AlertOctagon size={11} className="mr-0.5" />
      };
    }
    if (residualPct > 6) {
      return {
        text: 'DEVIATION',
        badgeClass: 'bg-[var(--color-brand-yellow)] text-black border-black',
        icon: <AlertTriangle size={11} className="mr-0.5" />
      };
    }
    return {
      text: 'NOMINAL',
      badgeClass: 'bg-[var(--color-brand-green)] text-black border-black',
      icon: <CheckCircle2 size={11} className="mr-0.5" />
    };
  };

  const entries = Object.entries(telemetry).filter(([key, param]) => {
    if (filter === 'ALL') return true;
    const status = getStatus(param);
    if (filter === 'ANOMALIES') return status.text !== 'NOMINAL';
    if (filter === 'THERMAL') return ['cht', 'egt', 'oilTemp'].includes(key);
    if (filter === 'MECHANICAL') return ['rpm', 'vibrationRms', 'oilPressure', 'fuelFlow', 'injectionTiming', 'batteryVoltage'].includes(key);
    return true;
  });

  const renderCard = (key: string, param: TelemetryParam) => {
    const status = getStatus(param);
    const residual = param.current - param.expected;
    const sign = residual > 0 ? '+' : '';
    const formattedResidual = Number.isInteger(residual) ? `${sign}${residual}` : `${sign}${residual.toFixed(1)}`;

    const rangeSpan = (param.nominalMax - param.nominalMin) || 1;
    const percentInRange = Math.max(0, Math.min(100, ((param.current - param.nominalMin) / rangeSpan) * 100));
    const explanation = SENSOR_EXPLANATIONS[key] || {
      plainName: param.label,
      plainDesc: param.role,
      analogy: 'Telemetry channel',
    };

    return (
      <div
        key={key}
        className="neo-card bg-white p-3.5 flex flex-col justify-between hover:shadow-[var(--shadow-neobrutalism)] transition-all border-2 border-black"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 border border-black bg-[var(--color-brand-light)] shrink-0">
              {getParamIcon(key)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <div className="font-extrabold text-xs uppercase leading-snug tracking-tight text-neutral-900 truncate" title={param.label}>
                  {plainLanguageMode ? explanation.plainName : param.label}
                </div>
                <JargonTooltip
                  term={param.label}
                  explanation={explanation.plainDesc}
                  analogy={explanation.analogy}
                  technicalDetails={`Nominal: ${param.nominalMin} to ${param.nominalMax} ${param.unit}. Physics Expected: ${param.expected} ${param.unit}.`}
                />
              </div>
              <div className="text-[10px] text-gray-500 font-mono truncate">
                {plainLanguageMode ? `${param.label} (${param.unit})` : param.role}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={cn("text-[9px] font-mono font-bold px-1.5 py-0.5 border flex items-center", status.badgeClass)}>
              {status.icon}
              {status.text}
            </span>
            <GuideLink sectionId={param.guideSection} />
          </div>
        </div>

        {/* Live Value & Expected */}
        <div className="my-1.5 flex items-baseline justify-between border-y border-gray-100 py-1.5">
          <div className="text-2xl font-extrabold font-mono tracking-tight">
            {param.current} <span className="text-xs font-sans font-bold text-gray-500">{param.unit}</span>
          </div>
          <div className="text-right font-mono">
            <div className="text-[10px] text-gray-400">Exp: {param.expected}{param.unit}</div>
            <div className={cn(
              "text-[11px] font-bold",
              Math.abs(residual) > 0.05
                ? (residual > 0 ? "text-[var(--color-brand-red)]" : "text-blue-700")
                : "text-gray-400"
            )}>
              Δ {formattedResidual}{param.unit}
            </div>
          </div>
        </div>

        {/* Range Bar */}
        <div className="mt-1">
          <div className="flex justify-between text-[9px] font-mono text-gray-400 mb-0.5">
            <span>{param.nominalMin}{param.unit}</span>
            <span className="text-[8px] uppercase tracking-wider text-gray-400">Nominal Envelope</span>
            <span>{param.nominalMax}{param.unit}</span>
          </div>
          <div className="w-full bg-gray-100 h-1.5 border border-black overflow-hidden relative">
            <div
              className={cn(
                "h-full transition-all duration-300",
                status.text === 'ANOMALY' ? 'bg-[var(--color-brand-red)]' :
                status.text === 'DEVIATION' ? 'bg-[var(--color-brand-yellow)]' : 'bg-black'
              )}
              style={{ width: `${percentInRange}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Telemetry Header with Category Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-2">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-base uppercase tracking-tight">
                {plainLanguageMode ? 'Live Engine Readings (9 Sensors)' : 'Multi-Parameter Sensor Telemetry'}
              </h3>
              <JargonTooltip
                term="9-Channel Telemetry Stream"
                explanation="Continuous real-time measurements from RPM, temperature, pressure, and vibration sensors across the engine."
                analogy="Like the vital-sign monitor in an intensive care unit tracking pulse, blood pressure, oxygen, and temperature simultaneously."
                technicalDetails="Synchronous sampling at 100 Hz (vibration at 1000 Hz) via SPI/I2C/CAN bus. Cross-checked against physical nominal bands."
              />
            </div>
            <span className="text-[10px] font-mono text-neutral-500 font-bold block">
              {plainLanguageMode ? 'Real-time readings compared with expected healthy baseline' : 'Synchronous Multi-Rate Telemetry Bus'}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black bg-[var(--color-brand-light)]">
            9 CHANNELS
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Filter Pills */}
          <div className="flex items-center border border-black bg-white p-0.5 font-mono text-[10px] font-bold">
            {(['ALL', 'ANOMALIES', 'THERMAL', 'MECHANICAL'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-2 py-0.5 transition-all",
                  filter === f ? "bg-black text-white" : "text-gray-600 hover:text-black hover:bg-gray-100"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <span className="hidden sm:inline text-[10px] font-mono text-gray-500 font-bold">
            {dataMode === 'SIMULATION' ? 'PHYSICS SYNTHESIS' : 'STM32 / CAN'}
          </span>
          <GuideLink sectionId="04-engine-sensors" label="Sensors & DAQ Guide" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {entries.map(([key, param]) => renderCard(key, param))}
      </div>
    </div>
  );
};
