import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { useSimulation } from './hooks/useSimulation';

// Pages
import { CommandCenter } from './pages/CommandCenter';
import { SignalAnalysisPage } from './pages/SignalAnalysisPage';
import { FaultDiagnosisPage } from './pages/FaultDiagnosisPage';
import { DigitalTwinPage } from './pages/DigitalTwinPage';
import { DegradationPage } from './pages/DegradationPage';
import { EvidenceHardwarePage } from './pages/EvidenceHardwarePage';
import { SystemStatusPage } from './pages/SystemStatusPage';
import { SystemGuidePage } from './pages/SystemGuidePage';

function App() {
  useSimulation();

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/command-center" replace />} />
          <Route path="/command-center" element={<CommandCenter />} />
          <Route path="/signal-analysis" element={<SignalAnalysisPage />} />
          <Route path="/fault-diagnosis" element={<FaultDiagnosisPage />} />
          <Route path="/digital-twin" element={<DigitalTwinPage />} />
          <Route path="/degradation-rul" element={<DegradationPage />} />
          <Route path="/evidence-hardware" element={<EvidenceHardwarePage />} />
          <Route path="/system-status" element={<SystemStatusPage />} />
          <Route path="/system-guide" element={<SystemGuidePage />} />
          <Route path="*" element={<Navigate to="/command-center" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
