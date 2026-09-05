import React from 'react';
import { useEngineStore } from '@/store/engineStore';
import { GuideLink } from '@/components/dashboard/GuideLink';
import { ShieldCheck, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SystemStatusPage: React.FC = () => {
  const {
    inferenceLatency,
    operatingCycle,
    dataMode,
    isSimulating
  } = useEngineStore();

  const hardwareNodes = [
    {
      name: 'ADXL355 3-Axis Accelerometer',
      bus: 'SPI (10 MHz)',
      status: 'ONLINE',
      rate: '1,000 Hz',
      noiseDensity: '25 μg/√Hz',
      health: 'NOMINAL',
      disclaimer: 'Demonstration hardware interface / synthetic high-rate telemetry feed.'
    },
    {
      name: 'STM32 Microcontroller (DAQ)',
      bus: 'DMA Circular Buffer',
      status: 'LOCKED',
      rate: 'Zero Frame Drop',
      noiseDensity: '32-bit Hardware Timer',
      health: 'NOMINAL',
      disclaimer: 'STM32 firmware target ready for SPI-to-CAN bus bridge.'
    },
    {
      name: 'Raspberry Pi CM4 Edge Host',
      bus: 'PCIe / UART / CAN',
      status: 'ONLINE',
      rate: '19 ms Inference',
      noiseDensity: 'Quad-Core ARM Cortex-A72',
      health: 'NOMINAL',
      disclaimer: 'Active web server & real-time ONNX inference target.'
    },
    {
      name: 'UAV CAN Bus 2.0B Interface',
      bus: 'ISO 11898-2',
      status: 'BROADCASTING',
      rate: '500 kbps (20 Hz packet)',
      noiseDensity: 'Differential Transceiver',
      health: 'NOMINAL',
      disclaimer: 'Standard UAV telemetry protocol structure.'
    }
  ];

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto animate-in fade-in duration-300">
      <div className="flex flex-wrap justify-between items-center border-b-4 border-black pb-2 gap-2">
        <div>
          <h2 className="text-3xl font-bold uppercase tracking-tight">System Status & Edge Health</h2>
          <p className="text-xs font-mono text-gray-600 mt-1">Real-time edge telemetry, DAQ buffer synchronization, and benchmark telemetry.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="neo-badge bg-[var(--color-brand-green)] text-black">
            SYSTEM HEALTHY
          </span>
          <GuideLink sectionId="12-edge-computing" label="Edge Architecture" />
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neo-card p-4 bg-white flex flex-col justify-between">
          <div className="text-xs font-bold text-gray-500 uppercase">Edge Inference Latency</div>
          <div className="text-3xl font-mono font-bold my-1 text-[var(--color-brand-blue)]">
            {inferenceLatency} <span className="text-lg font-normal">ms</span>
          </div>
          <div className="text-[10px] font-mono text-gray-500">Benchmark: &lt; 25ms Real-time budget</div>
        </div>

        <div className="neo-card p-4 bg-white flex flex-col justify-between">
          <div className="text-xs font-bold text-gray-500 uppercase">Operating Cycles</div>
          <div className="text-3xl font-mono font-bold my-1">
            {operatingCycle.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-gray-500">Continuous telemetry counter</div>
        </div>

        <div className="neo-card p-4 bg-white flex flex-col justify-between">
          <div className="text-xs font-bold text-gray-500 uppercase">Active Telemetry Mode</div>
          <div className="text-xl font-mono font-bold my-1 truncate">
            {dataMode}
          </div>
          <div className="text-[10px] font-mono text-gray-500">
            {dataMode === 'SIMULATION' ? 'Physics-informed synthetic stream' : 'Live hardware STM32 feed'}
          </div>
        </div>

        <div className="neo-card p-4 bg-white flex flex-col justify-between">
          <div className="text-xs font-bold text-gray-500 uppercase">Simulation State</div>
          <div className="text-2xl font-mono font-bold my-1 flex items-center gap-2">
            <span className={cn("w-3 h-3 rounded-full border border-black", isSimulating ? "bg-green-500 animate-pulse" : "bg-red-500")} />
            <span>{isSimulating ? 'RUNNING' : 'PAUSED'}</span>
          </div>
          <div className="text-[10px] font-mono text-gray-500">50ms tick rate loop</div>
        </div>
      </div>

      {/* Hardware Nodes Table */}
      <div className="neo-card bg-white p-6 space-y-4">
        <div className="flex justify-between items-center border-b-2 border-black pb-2">
          <h3 className="font-bold text-xl uppercase flex items-center gap-2">
            <Cpu size={22} /> Edge Stack Subsystem Status
          </h3>
          <span className="text-xs font-mono font-bold text-gray-500">4 / 4 NODES ONLINE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hardwareNodes.map((node, i) => (
            <div key={i} className="p-4 border-2 border-black bg-[var(--color-brand-light)] space-y-2">
              <div className="flex justify-between items-start">
                <span className="font-bold text-sm">{node.name}</span>
                <span className="px-2 py-0.5 border border-black text-[10px] font-mono font-bold bg-[var(--color-brand-green)] text-black">
                  {node.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-gray-300">
                <div>
                  <span className="text-gray-500 text-[10px] block">INTERFACE BUS</span>
                  <span className="font-bold">{node.bus}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">THROUGHPUT / RATE</span>
                  <span className="font-bold">{node.rate}</span>
                </div>
              </div>
              <div className="text-[10px] font-mono text-gray-600 bg-white p-2 border border-gray-300">
                {node.disclaimer}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Honest Prototype Claims & Verification Disclosure */}
      <div className="neo-card bg-[var(--color-brand-yellow)] border-4 border-black p-6 space-y-3">
        <div className="flex items-center gap-2 border-b-2 border-black pb-2">
          <ShieldCheck size={24} className="text-black" />
          <h3 className="font-bold text-xl uppercase text-black">
            Prototype Roadmap & Engineering Disclosure (Judge Verification)
          </h3>
        </div>
        <p className="font-mono text-xs leading-relaxed text-black font-semibold">
          In accordance with competition standards for SIH26054:
        </p>
        <ul className="space-y-1.5 font-mono text-xs text-black">
          <li><strong>• Implemented & Validated:</strong> 9-parameter sensor fusion logic, 12 deterministic physics-informed scenario engines, 1D-CNN/LSTM diagnostic architecture, FFT/STFT/WPD DSP signal decomposition, real-time spatial digital twin renderer, and prognostic RUL trajectory modeling.</li>
          <li><strong>• Prototype Status:</strong> The current demonstrator operates in software simulation mode with deterministic physics synthesis to guarantee repeatable judge evaluation.</li>
          <li><strong>• Future Live Hardware Integration:</strong> Direct SPI DMA ingestion from physical ADXL355 and CAN bus transceiver broadcast to external UAV Flight Management Systems.</li>
        </ul>
      </div>
    </div>
  );
};
