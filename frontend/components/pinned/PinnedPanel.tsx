'use client';

import React from 'react';
import { useUIState } from '@/lib/providers/UIStateProvider';
import { ChartPanel } from '../output/ChartPanel';
import { X } from 'lucide-react';

export function PinnedPanel() {
  const { pinnedChart, setPinnedChart } = useUIState();

  return (
    <div className={`transition-all duration-200 ease-in-out border-l border-surface-border bg-[#0F121A] shrink-0 h-full overflow-y-auto ${pinnedChart ? 'w-[450px] opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
      <div className="w-[450px] p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span className="text-brand-indigo">📌</span> Pinned Chart
          </h3>
          <button 
            onClick={() => setPinnedChart(null)}
            className="p-1 px-2 text-xs font-medium text-slate-400 hover:text-white bg-surface border border-surface-border rounded-md hover:bg-surface-border transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Unpin
          </button>
        </div>
        
        {/* We use a key based on chart serialization to force remount/crossfade if chart changes */}
        {pinnedChart && (
          <div key={JSON.stringify(pinnedChart.data).slice(0, 50)} className="animate-in fade-in duration-500">
            <ChartPanel 
              chartType={pinnedChart.type} 
              chartData={pinnedChart.data} 
              isPinnedPanel={true}
              defaultExpanded={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
