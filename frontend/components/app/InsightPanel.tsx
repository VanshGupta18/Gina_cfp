'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  BarChart2,
  TrendingUp,
  BarChart,
  LineChart as LineChartIcon,
  Table2,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import type { ChartType, QueryResultTable } from '@/types';
import { useUIState } from '@/lib/providers/UIStateProvider';
import type { PinnedChartState } from '@/lib/providers/UIStateProvider';

import { renderChart } from '../charts/ChartRenderer';

function ChartTypeIcon({ type }: { type: ChartType }) {
  const cls = 'w-4 h-4';
  switch (type) {
    case 'bar':
      return <BarChart2 className={cls} />;
    case 'line':
      return <TrendingUp className={cls} />;
    case 'grouped_bar':
      return <BarChart className={cls} />;
    case 'stacked_bar':
      return <BarChart className={cls} />;
    case 'table':
      return <Table2 className={cls} />;
    case 'big_number':
      return <LineChartIcon className={cls} />;
    default:
      return <BarChart2 className={cls} />;
  }
}

function chartTypeLabel(type: ChartType): string {
  switch (type) {
    case 'bar':
      return 'Bar Chart';
    case 'line':
      return 'Line Chart';
    case 'grouped_bar':
      return 'Grouped Bar';
    case 'stacked_bar':
      return 'Stacked Bar';
    case 'table':
      return 'Data Table';
    case 'big_number':
      return 'Key Figure';
    default:
      return 'Visualization';
  }
}

function SqlResultTable({
  result,
  truncated,
}: {
  result: QueryResultTable;
  truncated?: boolean;
}) {
  const { columns, rows } = result;
  if (columns.length === 0) {
    return <p className="text-center text-sm text-slate-500 py-8">No columns in this result.</p>;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {truncated && (
        <p className="text-[11px] text-slate-500">
          Showing up to 100 rows (query capped server-side).
        </p>
      )}
      <div
        className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/8"
        style={{ background: 'rgba(8,10,15,0.6)' }}
      >
        <table className="w-max min-w-full border-collapse text-left text-xs">
          <thead
            className="sticky top-0 z-10"
            style={{
              background: 'rgba(18,22,32,0.95)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-300"
                  title={col.key}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className="border-t border-white/[0.04] transition-colors hover:bg-white/[0.03]"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="max-w-[min(24rem,50vw)] whitespace-pre-wrap break-words px-3 py-2 font-mono text-[11px] leading-snug text-slate-400"
                  >
                    {row[col.key] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function InsightPanel() {
  const { insightPanelOpen, activeInsight, closeInsight, sessionCharts } = useUIState();

  const [panelWidth, setPanelWidth] = useState(400);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const [insightTab, setInsightTab] = useState<'chart' | 'data'>('chart');
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
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

  const hasMultipleCharts = sessionCharts.length > 1;
  const insightToDisplay: PinnedChartState | null = hasMultipleCharts
    ? sessionCharts[currentChartIndex] ?? null
    : activeInsight;

  useEffect(() => {
    setInsightTab('chart');
  }, [insightToDisplay?.id, currentChartIndex]);

  const handlePrevChart = () => {
    if (hasMultipleCharts) {
      setCurrentChartIndex((prev) => (prev - 1 + sessionCharts.length) % sessionCharts.length);
    }
  };

  const handleNextChart = () => {
    if (hasMultipleCharts) {
      setCurrentChartIndex((prev) => (prev + 1) % sessionCharts.length);
    }
  };

  const hasResultGrid =
    Boolean(insightToDisplay?.resultTable && insightToDisplay.resultTable.columns.length > 0);

  return (
    <>
      {insightPanelOpen && (
        <div className="fixed inset-0 z-[90] bg-black/40 lg:hidden" onClick={closeInsight} />
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

        <div style={{ width: `${panelWidth}px` }} className="flex flex-col h-full overflow-hidden">
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
                {hasMultipleCharts && (
                  <span className="text-brand-cyan">
                    {currentChartIndex + 1} / {sessionCharts.length}
                  </span>
                )}
              </p>
              <p className="truncate text-sm font-semibold text-slate-200">
                {insightToDisplay?.title ??
                  (insightToDisplay ? chartTypeLabel(insightToDisplay.type) : 'No insight')}
              </p>
              {insightToDisplay?.explanation ? (
                <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-slate-500">
                  {insightToDisplay.explanation}
                </p>
              ) : null}
            </div>

            {hasMultipleCharts && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevChart}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:text-slate-300 hover:bg-white/5"
                  aria-label="Previous chart"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextChart}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:text-slate-300 hover:bg-white/5"
                  aria-label="Next chart"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={closeInsight}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-white/5 hover:text-white"
              aria-label="Close insight panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
            {insightToDisplay ? (
              <div className="animate-fade-in flex min-h-0 flex-1 flex-col">
                <div className="mb-4 flex gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <button
                    type="button"
                    onClick={() => setInsightTab('chart')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                      insightTab === 'chart'
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <ChartTypeIcon type={insightToDisplay.type} />
                    Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => setInsightTab('data')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                      insightTab === 'data'
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Database className="h-3.5 w-3.5" />
                    Returned data
                  </button>
                </div>

                {insightTab === 'chart' ? (
                  <>
                    <div className="mb-4 flex items-center gap-2">
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
                    <div
                      className="min-h-0 flex-1 overflow-auto rounded-xl p-4"
                      style={{
                        background: 'rgba(18,22,32,0.8)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      {renderChart(insightToDisplay.type, insightToDisplay.data)}
                    </div>
                  </>
                ) : hasResultGrid && insightToDisplay.resultTable ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <SqlResultTable
                      result={insightToDisplay.resultTable}
                      truncated={insightToDisplay.resultTruncated}
                    />
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-white/8 bg-[rgba(18,22,32,0.5)] p-8 text-center">
                    <Table2 className="h-8 w-8 text-slate-600" />
                    <p className="text-sm text-slate-500">No raw query rows for this answer.</p>
                    <p className="text-xs text-slate-600">
                      Conversational replies and cache-only answers do not attach a result grid.
                    </p>
                  </div>
                )}

                <p className="mt-5 shrink-0 text-xs text-white/20 text-center">
                  Click &quot;View in Insights&quot; on a chart in the conversation to open this panel.
                </p>
              </div>
            ) : (
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
