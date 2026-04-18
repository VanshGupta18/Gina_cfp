'use client';

import type { Dataset } from '@/types';
import DemoBadge from '@/components/sidebar/DemoBadge';
import { Database } from 'lucide-react';

interface DatasetWelcomeProps {
  dataset: Dataset;
}

export function DatasetWelcome({ dataset }: DatasetWelcomeProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(160deg, rgba(20,24,34,0.95) 0%, rgba(28,33,46,0.85) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-indigo/20 border border-brand-indigo/30">
            <Database className="h-5 w-5 text-brand-indigo-light" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Active Dataset</p>
            <p className="text-lg font-semibold text-white truncate">{dataset.name}</p>
          </div>
          {dataset.isDemo && <DemoBadge />}
        </div>

        <p className="text-slate-300 text-sm leading-relaxed">
          Ask a question in plain English to generate grounded answers with SQL, charts, and follow-up insights.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {dataset.rowCount !== null && (
            <span className="px-2.5 py-1 rounded-full border border-white/10 text-slate-300 bg-white/5">
              {dataset.rowCount.toLocaleString()} rows
            </span>
          )}
          {dataset.columnCount !== null && (
            <span className="px-2.5 py-1 rounded-full border border-white/10 text-slate-300 bg-white/5">
              {dataset.columnCount} columns
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
