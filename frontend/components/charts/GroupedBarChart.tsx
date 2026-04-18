'use client';

import React from 'react';
import { StandardChartData } from '@/types';
import { formatChartAxisLabel, formatChartNumber } from '@/lib/charts/formatChartNumber';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

const COLORS = ['#006D6F', '#1D2B53', '#F5A623', '#008E90', '#2A3F7A', '#F7BC5A'];

export function GroupedBarChart({ data, isInline }: { data: StandardChartData; isInline?: boolean }) {
  const chartData = data.labels.map((label, index) => {
    const row: Record<string, unknown> = { name: label };
    data.datasets.forEach((dataset) => {
      row[dataset.label] = dataset.data[index];
    });
    return row;
  });

  return (
    <div className={`w-full ${isInline ? 'h-[200px] bg-transparent border-none p-1' : 'h-[400px] bg-surface-secondary border border-surface-border rounded-xl p-4'}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={chartData}
          margin={isInline ? { top: 5, right: 10, left: 10, bottom: 5 } : { top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2E3D5A" />
          <XAxis
            dataKey="name"
            stroke="#94a3b8"
            fontSize={isInline ? 10 : 12}
            tickLine={false}
            tickFormatter={(v) => formatChartAxisLabel(v)}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={isInline ? 10 : 12}
            tickLine={false}
            tickFormatter={(v) => formatChartNumber(v)}
          />
          {!isInline && (
            <Tooltip
              formatter={(v) => formatChartNumber(v)}
              labelFormatter={(label) => formatChartAxisLabel(label)}
              cursor={{ fill: 'rgba(46, 61, 90, 0.4)' }}
              contentStyle={{ backgroundColor: '#1A2235', borderColor: '#2E3D5A', color: '#E8EDF5', borderRadius: '8px' }}
              itemStyle={{ color: '#E8EDF5' }}
            />
          )}
          {!isInline && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
          {data.datasets.map((dataset, idx) => (
            <Bar 
              key={dataset.label} 
              dataKey={dataset.label} 
              fill={COLORS[idx % COLORS.length]} 
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
