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
  id?: string; // unique identifier for the chart
}

interface UIStateContextType {
  isSnapshotMode: boolean;
  toggleSnapshotMode: () => Promise<void>;
  // InsightPanel
  insightPanelOpen: boolean;
  activeInsight: PinnedChartState | null;
  sessionCharts: PinnedChartState[]; // All charts in current session
  openInsight: (type: ChartType, data: ChartData, title?: string) => void;
  openInsightWithAll: (charts: PinnedChartState[], activeIndex?: number) => void; // Open with all charts
  registerChart: (chart: PinnedChartState) => void;
  closeInsight: () => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const [isSnapshotMode, setIsSnapshotMode] = useState(false);

  const { showToast } = useToast();

  // InsightPanel state
  const [insightPanelOpen, setInsightPanelOpen] = useState(false);
  const [activeInsight, setActiveInsight] = useState<PinnedChartState | null>(null);
  const [sessionCharts, setSessionCharts] = useState<PinnedChartState[]>([]);

  const pathname = usePathname();

  // Chat-scoped: clear when navigating to different chats
  useEffect(() => {
    setActiveInsight(null);
    setSessionCharts([]); // Clear all charts when changing chats
    setInsightPanelOpen(false);
  }, [pathname]);

  const registerChart = useCallback((chart: PinnedChartState) => {
    // Generate unique ID if not provided
    const chartWithId = { 
      ...chart, 
      id: chart.id || `chart-${Date.now()}-${Math.random()}`
    };
    // Avoid duplicates - check if this exact chart already exists
    setSessionCharts((prev) => {
      const exists = prev.some(
        (c) => c.type === chart.type && JSON.stringify(c.data) === JSON.stringify(chart.data)
      );
      return exists ? prev : [...prev, chartWithId];
    });
  }, []);

  const openInsight = useCallback((type: ChartType, data: ChartData, title?: string) => {
    setActiveInsight({ type, data, title });
    setInsightPanelOpen(true);
  }, []);

  const openInsightWithAll = useCallback((charts: PinnedChartState[], activeIndex?: number) => {
    // Update session charts with the provided ones
    setSessionCharts(
      charts.map((c, idx) => ({
        ...c,
        id: c.id || `chart-${Date.now()}-${idx}`,
      }))
    );
    // Set active insight to the specified index or first one
    const idx = activeIndex ?? 0;
    if (charts[idx]) {
      setActiveInsight(charts[idx]);
    }
    setInsightPanelOpen(true);
  }, []);

  const closeInsight = useCallback(() => {
    setInsightPanelOpen(false);
  }, []);

  const toggleSnapshotMode = useCallback(async () => {
    try {
      const res = await postSnapshotToggle();
      const next = res.snapshotMode;
      setIsSnapshotMode(next);
      showToast(`Snapshot mode ${next ? 'enabled' : 'disabled'}`, 'info', 3000);
    } catch (e) {
      console.error('Failed to toggle snapshot mode:', e);
    }
  }, [showToast]);

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
  }, [insightPanelOpen, closeInsight, toggleSnapshotMode]);

  return (
    <UIStateContext.Provider
      value={{
        isSnapshotMode,
        toggleSnapshotMode,
        insightPanelOpen,
        activeInsight,
        sessionCharts,
        openInsight,
        openInsightWithAll,
        registerChart,
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
