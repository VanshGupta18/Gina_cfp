'use client';

import React from 'react';
import { OutputPayload } from '@/types';

// Child components
import { KeyFigure } from './KeyFigure';
import { NarrativeText } from './NarrativeText';
import { CitationChips } from './CitationChips';
import { SQLExpand } from './SQLExpand';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { FollowUpSuggestions } from './FollowUpSuggestions';
import { SomethingOff } from './SomethingOff';
import { ChartPanel } from './ChartPanel';

export interface OutputCardProps {
  payload: OutputPayload;
  onCorrectionClick?: () => void;
}

export function OutputCard({ payload, onCorrectionClick }: OutputCardProps) {
  if (!payload) return null;

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top section: The analytic insight box */}
      <div className="rounded-xl bg-surface/50 border border-surface-border p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        
        <div className="flex items-start justify-between mb-4">
          <KeyFigure text={payload.keyFigure} />
          <ConfidenceIndicator score={payload.confidenceScore} />
        </div>
        
        <div className="prose prose-invert prose-slate max-w-none text-slate-300">
          <NarrativeText text={payload.narrative} />
        </div>
        
        {/* Chart Panel dispatcher (collapsed by default) */}
        {payload.chartType && payload.chartType !== 'table' && (
          <div className="mt-6 border-t border-surface-border pt-6">
            <ChartPanel 
              chartType={payload.chartType} 
              chartData={payload.chartData} 
            />
          </div>
        )}

        {/* Citations that the AI used */}
        {payload.citationChips && payload.citationChips.length > 0 && (
          <div className="mt-6 border-t border-surface-border pt-4">
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

      {/* Bottom section controls */}
      <div className="flex flex-col gap-4">
        <FollowUpSuggestions suggestions={payload.followUpSuggestions} />
        <SomethingOff onCorrectionClick={onCorrectionClick} />
      </div>

    </div>
  );
}
