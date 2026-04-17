'use client';

import React, { memo } from 'react';
import { OutputPayload } from '@/types';
import { BarChart2, ArrowUpRight, Timer } from 'lucide-react';
import { useUIState } from '@/lib/providers/UIStateProvider';

import { KeyFigure } from './KeyFigure';
import { NarrativeText } from './NarrativeText';
import { CitationChips } from './CitationChips';
import { SQLExpand } from './SQLExpand';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { FollowUpSuggestions } from './FollowUpSuggestions';
import { SomethingOff } from './SomethingOff';
import { DataTable } from '../charts/DataTable';

export interface OutputCardProps {
  payload: OutputPayload;
  onCorrectionClick?: () => void;
}

function formatAnswerTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '';
  return `Answer ready in ${Math.round(ms)} ms`;
}

function chartLabel(type: string): string {
  switch (type) {
    case 'bar': return 'Bar Chart';
    case 'line': return 'Line Chart';
    case 'grouped_bar': return 'Grouped Bar';
    case 'stacked_bar': return 'Stacked Bar';
    case 'table': return 'Data Table';
    case 'big_number': return 'Key Figure';
    default: return 'Chart';
  }
}

function OutputCardImpl({ payload, onCorrectionClick }: OutputCardProps) {
  const { openInsight } = useUIState();

  if (!payload) return null;

  const hasChart = payload.chartType && payload.chartData;
  // Tables render inline for readability; we still offer Insights for chart vs raw SQL data tabs.
  const showTableInline = payload.chartType === 'table';

  const openThisInsight = () =>
    openInsight({
      type: payload.chartType!,
      data: payload.chartData!,
      title: chartLabel(payload.chartType!),
      resultTable: payload.resultTable ?? null,
      resultTruncated: payload.resultTruncated,
      explanation: payload.explanation,
    });

  return (
    <div className="flex flex-col gap-5">

      {/* Main insight card */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(160deg, rgba(20,24,34,0.95) 0%, rgba(28,33,46,0.85) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Top: key figure + confidence */}
        <div className="flex items-start justify-between mb-5">
          <KeyFigure text={payload.keyFigure} />
          <ConfidenceIndicator score={payload.confidenceScore} />
        </div>

        {/* Narrative */}
        <div className="prose prose-invert prose-slate max-w-none text-slate-300 text-sm leading-relaxed mb-5">
          <NarrativeText text={payload.narrative} />
        </div>

        {/* Chart chip — open right Insight panel (chart + returned data tabs) */}
        {hasChart && !showTableInline && (
          <div
            className="mt-2 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              onClick={openThisInsight}
              className="group inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all duration-200"
              style={{
                background: 'rgba(90,78,227,0.10)',
                border: '1px solid rgba(90,78,227,0.25)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'rgba(90,78,227,0.18)';
                el.style.borderColor = 'rgba(90,78,227,0.50)';
                el.style.boxShadow = '0 4px 16px rgba(90,78,227,0.2)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'rgba(90,78,227,0.10)';
                el.style.borderColor = 'rgba(90,78,227,0.25)';
                el.style.boxShadow = '';
              }}
            >
              <BarChart2 className="h-4 w-4 text-brand-cyan shrink-0" />
              <span>
                View{' '}
                <span className="text-brand-cyan font-semibold">
                  {chartLabel(payload.chartType!)}
                </span>{' '}
                in Insights
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-brand-indigo-light opacity-70 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        )}

        {/* Data table: rendered inline (tables don't benefit from a separate panel) */}
        {hasChart && showTableInline && (
          <div
            className="mt-4 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <DataTable data={payload.chartData as never} />
            <div className="mt-4">
              <button
                type="button"
                onClick={openThisInsight}
                className="group inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all duration-200"
                style={{
                  background: 'rgba(90,78,227,0.10)',
                  border: '1px solid rgba(90,78,227,0.25)',
                }}
              >
                <BarChart2 className="h-4 w-4 text-brand-cyan shrink-0" />
                <span>
                  Open in Insights <span className="text-brand-cyan font-semibold">(chart &amp; raw data)</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-brand-indigo-light opacity-70 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </div>
          </div>
        )}

        {/* Citations */}
        {payload.citationChips && payload.citationChips.length > 0 && (
          <div
            className="mt-5 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <CitationChips citations={payload.citationChips} />
          </div>
        )}

        {payload.totalTimeMs != null &&
          Number.isFinite(payload.totalTimeMs) &&
          payload.totalTimeMs >= 0 && (
            <div
              className="mt-4 flex items-center justify-end gap-1.5 border-t pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Timer className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden />
              <span className="text-[11px] font-medium tabular-nums tracking-wide text-slate-500">
                {formatAnswerTime(payload.totalTimeMs)}
              </span>
            </div>
          )}
      </div>

      {/* SQL Details */}
      {(payload.sql || payload.secondarySql) && (
        <SQLExpand
          sql={payload.sql}
          secondarySql={payload.secondarySql}
          rowsReturned={payload.rowCount}
          explanation={payload.explanation}
        />
      )}

      {/* Follow-ups + corrections */}
      <div className="flex flex-col gap-4">
        <FollowUpSuggestions suggestions={payload.followUpSuggestions} />
        <SomethingOff onCorrectionClick={onCorrectionClick} />
      </div>

    </div>
  );
}

export const OutputCard = memo(OutputCardImpl);
