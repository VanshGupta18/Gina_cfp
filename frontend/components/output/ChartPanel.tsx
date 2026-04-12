import React, { useState } from 'react';
import type { ChartType, ChartData, StandardChartData, BigNumberChartData } from '@/types';
import { ChevronDown, BarChart2 } from 'lucide-react';

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
    <div className="w-full">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-brand-cyan hover:text-white transition-colors"
      >
        <BarChart2 className="w-4 h-4" />
        <span>View Visualization</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="relative mt-4 bg-surface rounded-lg p-4 border border-surface-border">
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
