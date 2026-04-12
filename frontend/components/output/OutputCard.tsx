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
    <div className="rounded-xl bg-surface border border-surface-border p-6 shadow-sm">
      
      <KeyFigure text={payload.keyFigure} />
      
      <NarrativeText text={payload.narrative} />
      
      {/* Chart Panel dispatcher (collapsed by default) */}
      {payload.chartType && payload.chartType !== 'table' && (
        <ChartPanel 
          chartType={payload.chartType} 
          chartData={payload.chartData} 
        />
      )}

      {/* Citations that the AI used */}
      <CitationChips citations={payload.citationChips} />

      {/* SQL Details */}
      {(payload.sql || payload.secondarySql) && (
        <SQLExpand 
          sql={payload.sql} 
          secondarySql={payload.secondarySql} 
          rowsReturned={payload.rowCount}
        />
      )}

      {/* Confidence */}
      <ConfidenceIndicator score={payload.confidenceScore} />

      {/* Follow ups */}
      <FollowUpSuggestions suggestions={payload.followUpSuggestions} />

      {/* Edge case correction */}
      <SomethingOff onCorrectionClick={onCorrectionClick} />

    </div>
  );
}
