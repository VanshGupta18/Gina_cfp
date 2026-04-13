'use client';

import React, { useState } from 'react';
import TopBar from './TopBar';
import ConversationRail from './ConversationRail';
import InsightPanel from './InsightPanel';
import { CorrectionModal } from '@/components/upload/CorrectionModal';
import { useDatasets } from '@/lib/hooks/useDatasets';
import { useUIState } from '@/lib/providers/UIStateProvider';
import { BarChart2, ChevronRight } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const { activeDataset, refreshDatasets } = useDatasets();
  const { insightPanelOpen, openInsight, activeInsight, pinnedChart, setPinnedChart } = useUIState();

  const handleOpenPanel = () => {
    // We already have a specific function on useUIState, but we just need it open.
    // openInsight sets activeInsight.
    if (activeInsight) {
      openInsight(activeInsight.type, activeInsight.data, activeInsight.title);
    } else {
      // Just toggle state via clicking a dummy openInsight if we have to, 
      // but UIStateProvider doesn't expose setInsightPanelOpen directly.
      // We can just call openInsight with pinnedChart info. Since it's pinned anyway,
      // setting it to activeInsight temporarily doesn't break anything.
      if (pinnedChart) {
         openInsight(pinnedChart.type, pinnedChart.data, pinnedChart.title);
      }
    }
  };

  const hasInsight = activeInsight || pinnedChart;

  return (
    <div className="flex h-screen w-full flex-col bg-surface overflow-hidden">
      <TopBar
        onMenuClick={() => setMobileRailOpen(true)}
        onOpenSemanticCorrections={() => setCorrectionOpen(true)}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Mobile rail backdrop */}
        {mobileRailOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileRailOpen(false)}
          />
        )}

        {/* Left Sidebar — ConversationRail */}
        <aside
          className={[
            'flex w-[240px] shrink-0 flex-col transition-transform duration-200 ease-out',
            'fixed inset-y-14 left-0 z-50 md:relative md:inset-auto md:z-0 md:translate-x-0',
            mobileRailOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          ].join(' ')}
        >
          <ConversationRail onNavigate={() => setMobileRailOpen(false)} />
        </aside>

        {/* Main content */}
        <main
          className="flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        >
          {children}
        </main>

        {/* Right Panel — InsightPanel (always mounted, slides in/out) */}
        <InsightPanel />
      </div>

      {/* Insight panel toggle button — visible when panel is closed but there's an active insight */}
      {!insightPanelOpen && hasInsight && (
        <button
          onClick={handleOpenPanel}
          className="fixed bottom-24 right-5 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #5A4EE3, #3CE0D6)',
            boxShadow: '0 4px 20px rgba(90,78,227,0.4)',
          }}
        >
          <BarChart2 className="h-4 w-4" />
          View Insight
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

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
