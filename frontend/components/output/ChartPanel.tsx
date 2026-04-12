import React, { useState } from 'react';
import type { ChartType, ChartData, StandardChartData, BigNumberChartData } from '@/types';

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
  chartData 
}: { 
  chartType: ChartType; 
  chartData: ChartData;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

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
    <div className="mb-4">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-2 text-sm font-medium text-brand-teal hover:text-brand-teal-light transition-colors"
      >
        <span>See chart</span>
        <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="relative pt-2">
          {renderChart()}
          <PinButton 
            isPinned={isPinned} 
            onToggle={() => setIsPinned(!isPinned)} 
          />
        </div>
      )}
    </div>
  );
}
