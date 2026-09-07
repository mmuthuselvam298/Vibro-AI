import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DemoControls } from '../dashboard/DemoControls';
import { GuidedTourModal } from '../dashboard/GuidedTourModal';
import { EngineReportModal } from '../dashboard/EngineReportModal';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[var(--color-bg-base)] overflow-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenTour={() => setIsTourOpen(true)}
          onOpenReport={() => setIsReportOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-32">
          {children}
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none p-4 md:p-6 flex justify-end">
          <div className="pointer-events-auto">
             <DemoControls />
          </div>
        </div>
      </div>

      {/* Global Modals for Judging & Walkthrough */}
      <GuidedTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />

      <EngineReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
};
