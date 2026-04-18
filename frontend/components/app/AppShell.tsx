'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import TopBar from './TopBar';
import NonTechSidebar from '@/components/sidebar/NonTechSidebar';
import InsightPanel from './InsightPanel';
import { DatasetSheetPanel } from '@/components/dataset/DatasetSheetPanel';
import { CorrectionModal } from '@/components/upload/CorrectionModal';
import { useDatasets } from '@/lib/hooks/useDatasets';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [datasetSheetOpen, setDatasetSheetOpen] = useState(false);
  const { activeDataset, refreshDatasets } = useDatasets();

  const isWelcomePage = pathname === '/app';

  return (
    <div className="flex h-screen w-full flex-col bg-surface overflow-hidden">
      <TopBar onMenuClick={() => setMobileRailOpen(true)} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {mobileRailOpen && !isWelcomePage && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileRailOpen(false)}
          />
        )}

        {!isWelcomePage && (
          <aside
            className={[
              'flex w-[240px] shrink-0 flex-col transition-transform duration-200 ease-out',
              'fixed inset-y-14 left-0 z-50 md:relative md:inset-auto md:z-0 md:translate-x-0',
              mobileRailOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            ].join(' ')}
          >
            <NonTechSidebar
              onNavigate={() => setMobileRailOpen(false)}
              onViewDataset={() => setDatasetSheetOpen(true)}
              onSemanticCorrections={() => setCorrectionOpen(true)}
            />
          </aside>
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]">
          {children}
        </main>

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

      {datasetSheetOpen && activeDataset && (
        <DatasetSheetPanel
          open={datasetSheetOpen}
          onClose={() => setDatasetSheetOpen(false)}
          datasetId={activeDataset.id}
          datasetName={activeDataset.name}
        />
      )}
    </div>
  );
}
