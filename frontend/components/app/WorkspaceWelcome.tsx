'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Dataset } from '@/types';
import { useDatasets } from '@/lib/hooks/useDatasets';
import { useUploadModal } from '@/lib/hooks/useUploadModal';
import DemoBadge from '@/components/sidebar/DemoBadge';
import { listConversations, createConversation } from '@/lib/api/conversations';
import {
  Database,
  MessageSquare,
  Sparkles,
  UploadCloud,
  ChevronRight,
  Loader2,
} from 'lucide-react';

export default function WorkspaceWelcome() {
  const router = useRouter();
  const { datasets, setActiveDataset } = useDatasets();
  const { openUploadModal } = useUploadModal();
  const [openingId, setOpeningId] = useState<string | null>(null);

  const demoDatasets = datasets.filter((d) => d.isDemo);
  const userDatasets = datasets.filter((d) => !d.isDemo);

  const openDataset = async (d: Dataset) => {
    setOpeningId(d.id);
    try {
      setActiveDataset(d);
      const convs = await listConversations(d.id);
      if (convs.length > 0) {
        router.push(`/app/${convs[0].id}`);
        return;
      }
      const conv = await createConversation(d.id);
      router.push(`/app/${conv.id}`);
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-surface animate-fade-in">
      <div className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">

        {/* Hero */}
        <div
          className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
          style={{
            background: 'rgba(90,78,227,0.10)',
            border: '1px solid rgba(90,78,227,0.25)',
            color: '#7267F2',
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Workspace
        </div>

        <h1 className="mt-5 font-serif text-3xl font-light tracking-tight text-slate-100 md:text-4xl">
          Welcome to{' '}
          <span className="text-shimmer font-semibold">G.I.N.A</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
          Pick a dataset to start asking questions in plain English, upload your own CSV, or explore a demo.
          You can switch datasets anytime from the header.
        </p>

        {/* Upload CTA */}
        <div className="mt-8">
          <button
            type="button"
            onClick={openUploadModal}
            className="btn-press btn-glow inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white"
          >
            <UploadCloud className="h-4 w-4" />
            Upload a CSV
          </button>
        </div>

        {/* Demo datasets */}
        {demoDatasets.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-4 flex items-center gap-2">
              <span
                className="h-4 w-0.5 rounded-full"
                style={{ background: 'linear-gradient(to bottom, #5A4EE3, #3CE0D6)' }}
              />
              <Database className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                Demo datasets
              </span>
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {demoDatasets.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => void openDataset(d)}
                    disabled={openingId !== null}
                    className="group card-hover flex w-full items-start gap-3 rounded-2xl p-5 text-left disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg, rgba(20,24,34,0.8), rgba(28,33,46,0.6))',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: 'rgba(90,78,227,0.13)',
                        border: '1px solid rgba(90,78,227,0.2)',
                      }}
                    >
                      <MessageSquare className="h-5 w-5 text-brand-indigo-light" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-slate-100">{d.name}</span>
                        <DemoBadge />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {d.rowCount != null ? `${d.rowCount.toLocaleString()} rows` : 'Sample data'} · try questions instantly
                      </p>
                      <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-indigo-light group-hover:text-white transition-colors duration-150">
                        {openingId === d.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Opening…
                          </>
                        ) : (
                          <>
                            Open dataset
                            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-1" />
                          </>
                        )}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* User datasets */}
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2">
            <span
              className="h-4 w-0.5 rounded-full"
              style={{ background: 'linear-gradient(to bottom, #3CE0D6, #5A4EE3)' }}
            />
            <UploadCloud className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              Your datasets
            </span>
          </h2>
          {userDatasets.length === 0 ? (
            <div
              className="rounded-2xl px-5 py-8 text-center"
              style={{
                border: '1px dashed rgba(255,255,255,0.08)',
                background: 'rgba(20,24,34,0.4)',
              }}
            >
              <p className="text-sm text-slate-500">No uploads yet.</p>
              <button
                type="button"
                onClick={openUploadModal}
                className="mt-3 text-sm font-medium text-brand-indigo-light transition-colors hover:text-white"
              >
                Upload a CSV to analyse your own data
              </button>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {userDatasets.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => void openDataset(d)}
                    disabled={openingId !== null}
                    className="group card-hover flex w-full items-start gap-3 rounded-2xl p-5 text-left disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg, rgba(20,24,34,0.8), rgba(28,33,46,0.6))',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <Database className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-100">{d.name}</span>
                      <p className="mt-1 text-xs text-slate-500">
                        {d.rowCount != null ? `${d.rowCount.toLocaleString()} rows` : 'Your data'}
                      </p>
                      <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-indigo-light group-hover:text-white transition-colors duration-150">
                        {openingId === d.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Opening…
                          </>
                        ) : (
                          <>
                            Open dataset
                            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-1" />
                          </>
                        )}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
