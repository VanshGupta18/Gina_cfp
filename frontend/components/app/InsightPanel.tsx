'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, BarChart2, TrendingUp, BarChart, LineChart as LineChartIcon, Table2, Pin, PinOff } from 'lucide-react';
import type { ChartType, ChartData, StandardChartData, BigNumberChartData } from '@/types';
import { useUIState } from '@/lib/providers/UIStateProvider';

import { BigNumberCard } from '../charts/BigNumberCard';
import { BarChart as BarChartComp } from '../charts/BarChart';
import { LineChart } from '../charts/LineChart';
import { GroupedBarChart } from '../charts/GroupedBarChart';
import { StackedBarChart } from '../charts/StackedBarChart';
import { DataTable } from '../charts/DataTable';

function ChartTypeIcon({ type }: { type: ChartType }) {
  const cls = 'w-4 h-4';
  switch (type) {
    case 'bar': return <BarChart2 className={cls} />;
    case 'line': return <TrendingUp className={cls} />;
    case 'grouped_bar': return <BarChart className={cls} />;
    case 'stacked_bar': return <BarChart className={cls} />;
    case 'table': return <Table2 className={cls} />;
    case 'big_number': return <LineChartIcon className={cls} />;
    default: return <BarChart2 className={cls} />;
  }
}

function chartTypeLabel(type: ChartType): string {
  switch (type) {
    case 'bar': return 'Bar Chart';
    case 'line': return 'Line Chart';
    case 'grouped_bar': return 'Grouped Bar';
    case 'stacked_bar': return 'Stacked Bar';
    case 'table': return 'Data Table';
    case 'big_number': return 'Key Figure';
    default: return 'Visualization';
  }
}

function renderChart(type: ChartType, data: ChartData) {
  switch (type) {
    case 'big_number': {
      const d = data as unknown as BigNumberChartData;
      return <BigNumberCard label={d.label as string} value={d.value} />;
    }
    case 'bar': return <BarChartComp data={data as unknown as StandardChartData} />;
    case 'line': return <LineChart data={data as unknown as StandardChartData} />;
    case 'grouped_bar': return <GroupedBarChart data={data as unknown as StandardChartData} />;
    case 'stacked_bar': return <StackedBarChart data={data as unknown as StandardChartData} />;
    case 'table': return <DataTable data={data as unknown as StandardChartData} />;
    default: return <p className="text-slate-500 text-sm">Unsupported: {type}</p>;
  }
}

export default function InsightPanel() {
  const { 
    insightPanelOpen, activeInsight, closeInsight,
    pinnedChart, setPinnedChart 
  } = useUIState();

  const [panelWidth, setPanelWidth] = useState(400);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      // enforce min max
      if (newWidth >= 300 && newWidth <= Math.min(800, window.innerWidth - 100)) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const insightToDisplay = activeInsight || pinnedChart;

  const isCurrentPinned = insightToDisplay && pinnedChart && 
    pinnedChart.type === insightToDisplay.type && 
    JSON.stringify(pinnedChart.data) === JSON.stringify(insightToDisplay.data);

  const togglePin = () => {
    if (isCurrentPinned) {
      setPinnedChart(null);
    } else if (insightToDisplay) {
      setPinnedChart(insightToDisplay);
    }
  };

  return (
    <>
      {/* Backdrop — mobile only */}
      {insightPanelOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/40 lg:hidden"
          onClick={closeInsight}
        />
      )}

      <aside
        className="fixed top-14 bottom-0 right-0 z-[95] flex flex-col overflow-visible lg:relative lg:top-0 lg:z-auto lg:bottom-auto"
        style={{
          width: insightPanelOpen ? `${panelWidth}px` : '0px',
          maxWidth: '100vw',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: 'rgba(12, 15, 22, 0.95)',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          transition: isResizing.current ? 'none' : 'width 280ms cubic-bezier(0.16,1,0.3,1)',
        }}
        aria-label="Insight Panel"
      >
        {insightPanelOpen && (
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-indigo/30 transition-colors z-[100] group"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute left-[3px] top-1/2 -translate-y-1/2 h-10 w-0.5 bg-brand-indigo/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        
        {/* We use an inner container to preserve layout when w=0 */}
        <div style={{ width: `${panelWidth}px` }} className="flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div
          className="flex shrink-0 items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          {insightToDisplay && (
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-cyan"
              style={{ background: 'rgba(60,224,214,0.10)', border: '1px solid rgba(60,224,214,0.18)' }}
            >
              <ChartTypeIcon type={insightToDisplay.type} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25 flex items-center gap-2">
              Visualization
              {isCurrentPinned && (
                <span className="text-brand-indigo inline-flex items-center gap-1"><Pin className="w-2.5 h-2.5" /> Pinned</span>
              )}
            </p>
            <p className="truncate text-sm font-semibold text-slate-200">
              {insightToDisplay?.title ?? (insightToDisplay ? chartTypeLabel(insightToDisplay.type) : 'No insight')}
            </p>
          </div>
          {insightToDisplay && (
            <button
              onClick={togglePin}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 mr-1 ${
                isCurrentPinned 
                  ? 'text-brand-indigo bg-brand-indigo/10 hover:bg-brand-indigo/20' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
              aria-label={isCurrentPinned ? "Unpin chart" : "Pin chart"}
            >
              {isCurrentPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={closeInsight}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-white/5 hover:text-white"
            aria-label="Close insight panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
          {insightToDisplay ? (
            <div className="animate-fade-in">
              {/* Chart type badge */}
              <div className="mb-5 flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                  style={{
                    background: 'rgba(60,224,214,0.08)',
                    border: '1px solid rgba(60,224,214,0.18)',
                    color: 'rgba(60,224,214,0.9)',
                  }}
                >
                  <ChartTypeIcon type={insightToDisplay.type} />
                  {chartTypeLabel(insightToDisplay.type)}
                </span>
              </div>

              {/* Chart surface */}
              <div
                className="overflow-hidden rounded-xl p-4"
                style={{
                  background: 'rgba(18,22,32,0.8)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {renderChart(insightToDisplay.type, insightToDisplay.data)}
              </div>

              {!isCurrentPinned && (
                <p className="mt-5 text-xs text-white/20 text-center">
                  Click a chart chip in the conversation to update this panel.
                </p>
              )}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{
                  background: 'rgba(60,224,214,0.07)',
                  border: '1px solid rgba(60,224,214,0.15)',
                }}
              >
                <BarChart2 className="h-7 w-7 text-brand-cyan opacity-50" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-400">No insight selected</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Ask a question that produces a chart and click{' '}
                  <span className="text-brand-cyan">View in Insights</span> to visualize it here.
                </p>
              </div>
            </div>
          )}
        </div>
        </div>
      </aside>
    </>
  );
}
