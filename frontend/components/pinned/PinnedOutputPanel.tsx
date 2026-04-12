'use client';

import React from 'react';

export interface PinnedChartState {
  chartType: string;
  chartData: Record<string, unknown>;
  keyFigure?: string;
}

export function PinnedOutputPanel({ 
  pinnedState, 
  onUnpin 
}: { 
  pinnedState: PinnedChartState | null;
  onUnpin: () => void;
}) {
  return (
    <div 
      className={`border-l border-surface-border bg-surface-secondary overflow-hidden transition-all duration-300 ease-in-out ${
        pinnedState ? 'w-[400px] border-l' : 'w-0 border-l-0'
      }`}
    >
      {pinnedState && (
        <div className="flex flex-col h-full w-[400px] p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-border">
            <h3 className="font-semibold text-slate-200">Pinned Output</h3>
            <button 
              onClick={onUnpin}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Key Figure */}
          {pinnedState.keyFigure && (
            <div className="mb-6">
              <span className="text-3xl font-bold Tracking-tight text-brand-teal-light">
                {pinnedState.keyFigure}
              </span>
            </div>
          )}

          {/* Chart placeholder context - will be populated by rendering logic matching ChartPanel */}
          <div className="flex flex-col flex-1 min-h-[300px]">
            <p className="text-xs text-slate-400 mb-2 uppercase tracking-widest font-semibold">
              {pinnedState.chartType.replace('_', ' ')}
            </p>
            <div className="flex-1 bg-surface border border-surface-border rounded-xl p-4 flex items-center justify-center">
              <span className="text-slate-500 font-medium tracking-wide text-xs">
                CHART RENDERER HERE
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
