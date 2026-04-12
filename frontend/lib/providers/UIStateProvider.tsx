'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ChartType, ChartData } from '@/types';
import { postSnapshotToggle } from '@/lib/api/debug';

interface PinnedChartState {
  type: ChartType;
  data: ChartData;
}

interface UIStateContextType {
  pinnedChart: PinnedChartState | null;
  setPinnedChart: (chart: PinnedChartState | null) => void;
  isSnapshotMode: boolean;
  toggleSnapshotMode: () => Promise<void>;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const [pinnedChart, setPinnedChart] = useState<PinnedChartState | null>(null);
  const [isSnapshotMode, setIsSnapshotMode] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const toggleSnapshotMode = async () => {
    try {
      const res = await postSnapshotToggle();
      const next = res.snapshotMode;
      setIsSnapshotMode(next);
      setToastMessage(`Snapshot mode ${next ? 'enabled' : 'disabled'}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      console.error('Failed to toggle snapshot mode:', e);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleSnapshotMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <UIStateContext.Provider value={{ pinnedChart, setPinnedChart, isSnapshotMode, toggleSnapshotMode }}>
      {children}
      
      {/* Toast Notification */}
      <div 
        className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg bg-[#1C212E] border border-[#2A3143] shadow-lg shadow-black/50 text-amber-500 font-medium tracking-wide z-50 transition-all duration-300 ${
          showToast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        {toastMessage}
      </div>
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
