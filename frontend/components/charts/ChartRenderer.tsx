'use client';

import React from 'react';
import type { ChartType, ChartData, StandardChartData, BigNumberChartData } from '@/types';
import { BigNumberCard } from './BigNumberCard';
import { BarChart } from './BarChart';
import { LineChart } from './LineChart';
import { GroupedBarChart } from './GroupedBarChart';
import { StackedBarChart } from './StackedBarChart';
import { DataTable } from './DataTable';

interface ChartRendererProps {
  type: ChartType;
  data: ChartData;
  isInline?: boolean;
}

export function renderChart(type: ChartType, data: ChartData, isInline?: boolean) {
  switch (type) {
    case 'big_number': {
      const d = data as unknown as BigNumberChartData;
      return <BigNumberCard label={d.label as string} value={d.value} isInline={isInline} />;
    }
    case 'bar': return <BarChart data={data as unknown as StandardChartData} isInline={isInline} />;
    case 'line': return <LineChart data={data as unknown as StandardChartData} isInline={isInline} />;
    case 'grouped_bar': return <GroupedBarChart data={data as unknown as StandardChartData} isInline={isInline} />;
    case 'stacked_bar': return <StackedBarChart data={data as unknown as StandardChartData} isInline={isInline} />;
    case 'table': return <DataTable data={data as unknown as StandardChartData} isInline={isInline} />;
    default: return <p className="text-slate-500 text-sm">Unsupported visualization: {type}</p>;
  }
}

export default function ChartRenderer({ type, data, isInline }: ChartRendererProps) {
  return renderChart(type, data, isInline);
}
