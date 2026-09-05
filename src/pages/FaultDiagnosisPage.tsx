import React from 'react';
import { DiagnosisPanel } from '@/components/dashboard/DiagnosisPanel';
import { MaintenanceAdvisoryPanel } from '@/components/dashboard/MaintenanceAdvisoryPanel';
import { SensorFusionCard } from '@/components/dashboard/SensorFusionCard';
import { GuideLink } from '@/components/dashboard/GuideLink';
import { Cpu, Target } from 'lucide-react';

export const FaultDiagnosisPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto animate-in fade-in duration-300 pb-12">
      <div className="flex flex-wrap justify-between items-center border-b-4 border-black pb-2 gap-2">
        <div>
          <h2 className="text-3xl font-bold uppercase tracking-tight">AI Inference & Diagnostics</h2>
          <p className="text-xs font-mono text-gray-600 mt-1">
            Hybrid 1D-CNN / LSTM deep classification model with multi-parameter sensor fusion and explainable evidence validation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="neo-badge bg-[var(--color-brand-yellow)] text-black">
            12 FAULT CATEGORIES
          </span>
          <GuideLink sectionId="07-ai-fault-diagnosis" label="AI Architecture Guide" />
        </div>
      </div>

      {/* Sensor Fusion Decision Cross-Check */}
      <SensorFusionCard />

      {/* Primary Inference & Maintenance Advisory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DiagnosisPanel />
        <MaintenanceAdvisoryPanel />
      </div>

      {/* Deep Neural Architecture & Feature Attribution Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Neural Network Layer Pipeline */}
        <div className="neo-card flex flex-col justify-between bg-[var(--color-brand-blue)] text-white p-6">
          <div className="flex justify-between items-center border-b-2 border-white/40 pb-2 mb-4">
            <h3 className="font-bold text-xl uppercase text-white flex items-center gap-2">
              <Cpu size={22} className="text-[var(--color-brand-yellow)]" /> 1D-CNN + LSTM Deep Topology
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 border border-white bg-white/10">
              PYTORCH / ONNX
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-2.5 border-l-4 border-[var(--color-brand-yellow)] bg-white/10 pl-3">
              <div className="text-[var(--color-brand-yellow)] font-bold">1. INPUT TENSOR (Batch, Channels=9, Time=500)</div>
              <div className="text-gray-200">Raw ADXL355 Triaxial Vibration + RPM + CHT + EGT + Oil P/T + Fuel Flow.</div>
            </div>

            <div className="p-2.5 border-l-4 border-[var(--color-brand-yellow)] bg-white/10 pl-3">
              <div className="text-[var(--color-brand-yellow)] font-bold">2. 1D CONVOLUTIONAL FEATURE EXTRACTION</div>
              <div className="text-gray-200">3 Conv1D layers (Kernels 15, 7, 3; Receptive field covers fundamental and high harmonics).</div>
            </div>

            <div className="p-2.5 border-l-4 border-[var(--color-brand-yellow)] bg-white/10 pl-3">
              <div className="text-[var(--color-brand-yellow)] font-bold">3. TEMPORAL LSTM SEQUENCE RECURRENT LAYER</div>
              <div className="text-gray-200">Bidirectional LSTM (64 hidden units) models temporal degradation and dynamic transitions.</div>
            </div>

            <div className="p-2.5 border-l-4 border-[var(--color-brand-yellow)] bg-white/10 pl-3">
              <div className="text-[var(--color-brand-yellow)] font-bold">4. DENSE & SOFTMAX MULTI-CLASS PROBABILITY</div>
              <div className="text-gray-200">Outputs 12 posterior class probabilities with calibrated temperature scaling for uncertainty estimation.</div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-white/20 text-[10px] text-gray-400 font-mono">
            * Edge inference deployed via ONNX Runtime execution engine on Raspberry Pi CM4 (&lt; 20 ms).
          </div>
        </div>

        {/* Explainable AI & Feature Attribution */}
        <div className="neo-card bg-white p-6 space-y-4">
          <div className="flex justify-between items-center border-b-4 border-black pb-2">
            <h3 className="font-bold text-xl uppercase flex items-center gap-2">
              <Target size={22} /> Explainable Feature Attributions
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 border border-black bg-gray-100">
              SHAP / GRAD-CAM
            </span>
          </div>

          <p className="text-xs font-mono text-gray-600">
            Relative contribution of each sensory channel to the current diagnostic classification:
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-bold">Vibration Spectral Features (BPFO / 1X / 2X)</span>
                <span className="font-bold">38%</span>
              </div>
              <div className="w-full bg-gray-200 h-2.5 border border-black">
                <div className="bg-[var(--color-brand-blue)] h-full" style={{ width: '38%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-bold">Thermodynamic Residuals (CHT & EGT Deltas)</span>
                <span className="font-bold">26%</span>
              </div>
              <div className="w-full bg-gray-200 h-2.5 border border-black">
                <div className="bg-orange-500 h-full" style={{ width: '26%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-bold">Hydrodynamic Lubrication (Oil Pressure / Temp)</span>
                <span className="font-bold">22%</span>
              </div>
              <div className="w-full bg-gray-200 h-2.5 border border-black">
                <div className="bg-blue-600 h-full" style={{ width: '22%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-bold">Operating Context & Fuel Flow (RPM / BSFC)</span>
                <span className="font-bold">14%</span>
              </div>
              <div className="w-full bg-gray-200 h-2.5 border border-black">
                <div className="bg-[var(--color-brand-green)] h-full" style={{ width: '14%' }} />
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 border-2 border-black text-[11px] font-mono">
            <strong>Cross-Validation Guarantee:</strong> No maintenance action is triggered without cross-sensor validation from both high-frequency kinematic and low-frequency thermodynamic channels.
          </div>
        </div>

      </div>
    </div>
  );
};
