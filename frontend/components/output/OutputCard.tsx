'use client';

import React, { memo, useState, useEffect } from 'react';
import { OutputPayload, ChartData, StandardChartData, BigNumberChartData, ChartType } from '@/types';
import { Maximize2, ChevronDown, ChevronUp } from 'lucide-react';
import { useUIState } from '@/lib/providers/UIStateProvider';

import { KeyFigure } from './KeyFigure';
import { NarrativeText } from './NarrativeText';
import { CitationChips } from './CitationChips';
import { SQLExpand } from './SQLExpand';
import { FollowUpSuggestions } from './FollowUpSuggestions';
import { SomethingOff } from './SomethingOff';
import ChartRenderer from '../charts/ChartRenderer';

export interface OutputCardProps {
  payload: OutputPayload;
  onCorrectionClick?: () => void;
}

function chartLabel(type: ChartType): string {
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

function isStandardChartData(chartData: ChartData): chartData is StandardChartData {
  return 'labels' in chartData && 'datasets' in chartData;
}

function isBigNumberChartData(chartData: ChartData): chartData is BigNumberChartData {
  return 'value' in chartData;
}

function hasChartData(chartType?: ChartType, chartData?: ChartData): boolean {
  if (!chartType || !chartData) return false;

  if (chartType === 'big_number') {
    if (!isBigNumberChartData(chartData)) return false;
    const value = chartData.value;
    return value !== undefined && value !== null && String(value).trim().length > 0;
  }

  if (!isStandardChartData(chartData)) {
    return false;
  }

  const hasLabels = chartData.labels.length > 0;
  const hasDatasets = chartData.datasets.length > 0;
  const hasValues = chartData.datasets.some((dataset) => dataset.data.length > 0);

  return hasLabels && hasDatasets && hasValues;
}

function OutputCardImpl({ payload, onCorrectionClick }: OutputCardProps) {
  const { openInsightWithAll, registerChart, sessionCharts } = useUIState();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasChart = hasChartData(payload.chartType, payload.chartData);
  const isGraphical = hasChart && payload.chartType !== 'table';

  // Register chart when component mounts
  useEffect(() => {
    if (hasChart) {
      registerChart({
        type: payload.chartType!,
        data: payload.chartData!,
        title: chartLabel(payload.chartType!),
      });
    }
  }, [hasChart, payload.chartType, payload.chartData, registerChart]);

  const handleOpenAllCharts = () => {
    if (sessionCharts.length > 0) {
      // Find the index of the current chart in sessionCharts
      const activeIndex = sessionCharts.findIndex(
        (c) => c.type === payload.chartType && 
               JSON.stringify(c.data) === JSON.stringify(payload.chartData)
      );
      openInsightWithAll(sessionCharts, Math.max(0, activeIndex));
    }
  };

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
        {/* Top: key figure */}
        <div className="mb-5">
          <KeyFigure text={payload.keyFigure} />
        </div>

        {/* Narrative */}
        <div className="prose prose-invert prose-slate max-w-none text-slate-300 text-sm leading-relaxed mb-5">
          <NarrativeText text={payload.narrative} />
        </div>

        {/* Inline Chart Display */}
        {hasChart && (
          <div 
            className="relative mt-4 pt-4 group"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            {/* Chart Container with Collapse/Expand */}
            <div 
              className={`overflow-hidden transition-all duration-300 relative ${isGraphical && !isExpanded ? 'max-h-[200px]' : 'max-h-[1000px]'}`}
            >
              <ChartRenderer 
                type={payload.chartType!} 
                data={payload.chartData!} 
                isInline={!isExpanded}
              />
              
              {/* Gradient fade for collapsed state */}
              {isGraphical && !isExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#141822] to-transparent pointer-events-none" />
              )}

              {/* Maximize Button Overlay */}
              <button
                onClick={handleOpenAllCharts}
                className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800/80 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700 z-10"
                title={sessionCharts.length > 1 ? `View all ${sessionCharts.length} charts` : "View in Insights"}
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Expand/Collapse Toggle for Graphical Charts */}
            {isGraphical && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full mt-2 flex items-center justify-center gap-1 text-xs font-medium text-slate-400 hover:text-white transition-colors py-1"
              >
                {isExpanded ? (
                  <><ChevronUp className="w-3 h-3" /> Show Less</>
                ) : (
                  <><ChevronDown className="w-3 h-3" /> Show More</>
                )}
              </button>
            )}
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

      {/* Follow-ups + corrections — only show if there's content */}
      {(payload.followUpSuggestions?.length || onCorrectionClick) && (
        <div className="flex flex-col gap-4">
          <FollowUpSuggestions suggestions={payload.followUpSuggestions} />
          <SomethingOff onCorrectionClick={onCorrectionClick} />
        </div>
      )}

    </div>
  );
}

export const OutputCard = memo(OutputCardImpl);
