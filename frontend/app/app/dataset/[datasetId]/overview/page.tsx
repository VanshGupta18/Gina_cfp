'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { renderChart } from '@/components/charts/ChartRenderer';
import { getDatasetOverview } from '@/lib/api/datasets';
import type { ChartData, ChartType, DatasetOverviewStored } from '@/types';
import { useDatasets } from '@/lib/hooks/useDatasets';

function isOverviewStored(v: unknown): v is DatasetOverviewStored {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return o['version'] === 1 && typeof o['executiveSummary'] === 'string' && Array.isArray(o['charts']);
}

export default function DatasetOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const datasetId = typeof params['datasetId'] === 'string' ? params['datasetId'] : '';
  const { activeDataset, setActiveDataset, datasets } = useDatasets();

  const [status, setStatus] = useState<'loading' | 'pending' | 'ready' | 'failed'>('loading');
  const [overview, setOverview] = useState<DatasetOverviewStored | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ overviewModel: string | null; generatedAt: string | null } | null>(
    null,
  );

  useEffect(() => {
    if (!datasetId) return;
    const ds = datasets.find((d) => d.id === datasetId);
    if (ds) setActiveDataset(datasetId);
  }, [datasetId, datasets, setActiveDataset]);

  const poll = useCallback(async () => {
    if (!datasetId) return;
    try {
      const res = await getDatasetOverview(datasetId);
      if (res.status === 'pending') {
        setStatus('pending');
        return;
      }
      if (res.status === 'failed') {
        setStatus('failed');
        setError(res.error);
        return;
      }
      setStatus('ready');
      const ov = res.overview;
      if (isOverviewStored(ov)) {
        setOverview(ov);
      } else {
        setError('Invalid overview payload');
        setStatus('failed');
      }
      setMeta({ overviewModel: res.overviewModel ?? null, generatedAt: res.generatedAt ?? null });
    } catch (e) {
      setStatus('failed');
      setError(e instanceof Error ? e.message : 'Failed to load overview');
    }
  }, [datasetId]);

  useEffect(() => {
    if (!datasetId) return;
    void poll();
  }, [datasetId, poll]);

  useEffect(() => {
    if (status !== 'pending') return;
    const id = setInterval(() => void poll(), 2500);
    return () => clearInterval(id);
  }, [status, poll]);

  const title = activeDataset?.name ?? 'Dataset';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
      <header
        className="shrink-0 border-b border-white/6 px-4 py-3 md:px-6"
        style={{ background: 'rgba(12, 15, 22, 0.85)' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/app')}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Workspace
          </button>
          <span className="text-white/10">|</span>
          <div className="flex items-center gap-2 min-w-0">
            <LayoutDashboard className="h-4 w-4 shrink-0 text-brand-teal" />
            <h1 className="truncate font-serif text-lg font-semibold text-slate-100 md:text-xl">
              {title}
            </h1>
            <span className="hidden text-sm text-slate-500 sm:inline">— Overview</span>
          </div>
        </div>
        {meta?.generatedAt && status === 'ready' && (
          <p className="mt-1 text-[11px] text-slate-500">
            Generated {new Date(meta.generatedAt).toLocaleString()}
            {meta.overviewModel ? ` · ${meta.overviewModel}` : ''}
          </p>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-teal/30 border-t-brand-teal" />
            <p className="text-sm">Loading overview…</p>
          </div>
        )}

        {status === 'pending' && (
          <div className="mx-auto max-w-lg rounded-xl border border-brand-teal/20 bg-brand-teal/5 px-5 py-8 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-teal/30 border-t-brand-teal" />
            <p className="font-medium text-slate-200">Preparing your dataset overview</p>
            <p className="mt-2 text-sm text-slate-400">
              We&apos;re analyzing columns and building charts. This usually takes a few seconds.
            </p>
          </div>
        )}

        {status === 'failed' && (
          <div className="mx-auto max-w-lg rounded-xl border border-red-500/25 bg-red-500/10 px-5 py-6 text-center">
            <p className="text-sm text-red-200">{error ?? 'Overview unavailable'}</p>
            <p className="mt-3 text-xs text-slate-500">
              Try again after adjusting semantic corrections, or re-upload the file.
            </p>
            <Link
              href="/app"
              className="mt-4 inline-block text-sm font-medium text-brand-teal hover:underline"
            >
              Back to workspace
            </Link>
          </div>
        )}

        {status === 'ready' && overview && (
          <div className="mx-auto max-w-5xl space-y-8">
            <section className="rounded-2xl border border-white/8 bg-[rgba(8,10,15,0.5)] p-5 md:p-6">
              <h2 className="mb-2 font-medium text-slate-200">At a glance</h2>
              <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                {overview.executiveSummary}
              </p>
              {overview.statsHeadline && (
                <p className="mt-3 text-xs text-slate-500">
                  {overview.statsHeadline.rowCount.toLocaleString()} rows ·{' '}
                  {overview.statsHeadline.columnCount} columns
                </p>
              )}
            </section>

            {overview.highlights.length > 0 && (
              <section>
                <h2 className="mb-3 font-medium text-slate-200">Highlights</h2>
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-400">
                  {overview.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="mb-4 font-medium text-slate-200">Charts</h2>
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {overview.charts.map((ch, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col rounded-2xl border border-white/8 bg-[rgba(8,10,15,0.45)] p-4"
                  >
                    <h3 className="mb-1 text-sm font-medium text-slate-200">{ch.title}</h3>
                    {ch.insight && <p className="mb-3 text-xs text-slate-500">{ch.insight}</p>}
                    <div className="min-h-[280px] flex-1">
                      {renderChart(ch.chartType as ChartType, ch.chartData as ChartData)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
