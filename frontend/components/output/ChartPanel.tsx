import React, { useState } from 'react';
import type { ChartType, ChartData, StandardChartData, BigNumberChartData } from '@/types';
import { ChevronDown, BarChart2 } from 'lucide-react';
import { useUIState } from '@/lib/providers/UIStateProvider';

// Importing chart components
import { BigNumberCard } from '../charts/BigNumberCard';
import { BarChart } from '../charts/BarChart';
import { LineChart } from '../charts/LineChart';
import { GroupedBarChart } from '../charts/GroupedBarChart';
import { StackedBarChart } from '../charts/StackedBarChart';
import { DataTable } from '../charts/DataTable';
import { PinButton } from '../charts/PinButton';

export function ChartPanel({ 
  chartType, 
  chartData,
  isPinnedPanel = false,
  defaultExpanded = false
}: { 
  chartType: ChartType; 
  chartData: ChartData;
  isPinnedPanel?: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { pinnedChart, setPinnedChart } = useUIState();

  // If this ChartPanel is rendering exactly the pinned chart in the main chat view,
  // we could consider it "pinned". But generally we compare chartData identity or a deep equals.
  // For simplicity, we can do a naive check:
  const isPinned = pinnedChart?.type === chartType && JSON.stringify(pinnedChart?.data) === JSON.stringify(chartData);

  const handleTogglePin = () => {
    if (isPinnedPanel) return; // Can't pin/unpin from within the pinned panel itself using the standard button
    if (isPinned) {
      setPinnedChart(null);
    } else {
      setPinnedChart({ type: chartType, data: chartData });
    }
  };

  const renderChart = () => {
    switch (chartType) {
      case 'big_number': {
        const bigNum = chartData as unknown as BigNumberChartData;
        return <BigNumberCard label={bigNum.label as string} value={bigNum.value} />;
      }
      case 'bar':
        return <BarChart data={chartData as unknown as StandardChartData} />;
      case 'line':
        return <LineChart data={chartData as unknown as StandardChartData} />;
      case 'grouped_bar':
        return <GroupedBarChart data={chartData as unknown as StandardChartData} />;
      case 'stacked_bar':
        return <StackedBarChart data={chartData as unknown as StandardChartData} />;
      case 'table':
        return <DataTable data={chartData as unknown as StandardChartData} />;
      default:
        return <p className="text-slate-500">Unsupported chart type: {chartType}</p>;
    }
  };

  return (
    <div className="w-full">
      {!isPinnedPanel && (
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-brand-cyan hover:text-white transition-colors"
        >
          <BarChart2 className="w-4 h-4" />
          <span>View Visualization</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}

      {(expanded || isPinnedPanel) && (
        <div className={`relative mt-4 bg-surface rounded-lg p-4 border border-surface-border ${isPinnedPanel ? 'mt-0' : ''}`}>
          {renderChart()}
          {!isPinnedPanel && (
            <PinButton 
              isPinned={isPinned} 
              onToggle={handleTogglePin} 
            />
          )}
        </div>
      )}
    </div>
  );
}
