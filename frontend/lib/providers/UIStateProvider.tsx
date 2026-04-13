'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import type { ChartType, ChartData } from '@/types';
import { postSnapshotToggle } from '@/lib/api/debug';
import { useToast } from '@/lib/providers/ToastProvider';

interface PinnedChartState {
  type: ChartType;
  data: ChartData;
  title?: string;
}

interface UIStateContextType {
  pinnedChart: PinnedChartState | null;
  setPinnedChart: (chart: PinnedChartState | null) => void;
  isSnapshotMode: boolean;
  toggleSnapshotMode: () => Promise<void>;
  // InsightPanel
  insightPanelOpen: boolean;
  activeInsight: PinnedChartState | null;
  openInsight: (type: ChartType, data: ChartData, title?: string) => void;
  closeInsight: () => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const [pinnedChart, setPinnedChart] = useState<PinnedChartState | null>(null);
  const [isSnapshotMode, setIsSnapshotMode] = useState(false);

  const { showToast } = useToast();

  // InsightPanel state
  const [insightPanelOpen, setInsightPanelOpen] = useState(false);
  const [activeInsight, setActiveInsight] = useState<PinnedChartState | null>(null);

  const pathname = usePathname();

  // Chat-scoped active insight: clear when navigating to different chats
  useEffect(() => {
    setActiveInsight(null);
    // If we only were showing active insight and not pinned, close the panel
    setInsightPanelOpen(false);
  }, [pathname]);

  const openInsight = useCallback((type: ChartType, data: ChartData, title?: string) => {
    setActiveInsight({ type, data, title });
    setInsightPanelOpen(true);
  }, []);

  const closeInsight = useCallback(() => {
    setInsightPanelOpen(false);
  }, []);

  const toggleSnapshotMode = async () => {
    try {
      const res = await postSnapshotToggle();
      const next = res.snapshotMode;
      setIsSnapshotMode(next);
      showToast(`Snapshot mode ${next ? 'enabled' : 'disabled'}`, 'info', 3000);
    } catch (e) {
      console.error('Failed to toggle snapshot mode:', e);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        void toggleSnapshotMode();
      }
      // Escape closes insight panel
      if (e.key === 'Escape' && insightPanelOpen) {
        closeInsight();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [insightPanelOpen, closeInsight]);

  return (
    <UIStateContext.Provider
      value={{
        pinnedChart,
        setPinnedChart,
        isSnapshotMode,
        toggleSnapshotMode,
        insightPanelOpen,
        activeInsight,
        openInsight,
        closeInsight,
      }}
    >
      {children}
    </UIStateContext.Provider>
  );
}

export function useUIState() {
  const context = useContext(UIStateContext);
  if (context === undefined) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
}
