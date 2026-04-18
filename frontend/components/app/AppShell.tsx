'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import TopBar from './TopBar';
import NonTechSidebar from '@/components/sidebar/NonTechSidebar';
import InsightPanel from './InsightPanel';
import { CorrectionModal } from '@/components/upload/CorrectionModal';
import { useDatasets } from '@/lib/hooks/useDatasets';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const { activeDataset, refreshDatasets } = useDatasets();

  // Check if we're on the welcome page (/app)
  const isWelcomePage = pathname === '/app';

  return (
    <div className="flex h-screen w-full flex-col bg-surface overflow-hidden">
      <TopBar
        onMenuClick={() => setMobileRailOpen(true)}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Mobile rail backdrop */}
        {mobileRailOpen && !isWelcomePage && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileRailOpen(false)}
          />
        )}

        {/* Left Sidebar — NonTechSidebar (hidden on welcome page) */}
        {!isWelcomePage && (
          <aside
            className={[
              'flex w-[240px] shrink-0 flex-col transition-transform duration-200 ease-out',
              'fixed inset-y-14 left-0 z-50 md:relative md:inset-auto md:z-0 md:translate-x-0',
              mobileRailOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            ].join(' ')}
          >
            <NonTechSidebar onNavigate={() => setMobileRailOpen(false)} />
          </aside>
        )}

        {/* Main content */}
        <main
          className="flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        >
          {children}
        </main>

        {/* Right Panel — InsightPanel (always mounted, slides in/out) */}
        <InsightPanel />
      </div>

      {correctionOpen && activeDataset && (
        <CorrectionModal
          datasetId={activeDataset.id}
          onClose={() => setCorrectionOpen(false)}
          onSuccess={() => {
            setCorrectionOpen(false);
            void refreshDatasets();
          }}
        />
      )}
    </div>
  );
}
