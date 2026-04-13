'use client';

import React, { memo } from 'react';
import { OutputPayload } from '@/types';
import { BarChart2, ArrowUpRight } from 'lucide-react';
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
  // We show a "chart chip" for non-table charts, tables remain in-line to preserve readability
  const showTableInline = payload.chartType === 'table';

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

        {/* Chart chip — for non-table chart types */}
        {hasChart && !showTableInline && (
          <div
            className="mt-2 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              onClick={() =>
                openInsight(payload.chartType!, payload.chartData!, chartLabel(payload.chartType!))
              }
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
      </div>

      {/* SQL Details */}
      {(payload.sql || payload.secondarySql) && (
        <SQLExpand
          sql={payload.sql}
          secondarySql={payload.secondarySql}
          rowsReturned={payload.rowCount}
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
