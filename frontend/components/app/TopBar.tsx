'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Dataset } from '@/types';
import { useDatasets } from '@/lib/hooks/useDatasets';
import { useConversation } from '@/lib/hooks/useConversation';
import { useUploadModal } from '@/lib/hooks/useUploadModal';
import { useAuth } from '@/lib/hooks/useAuth';
import DemoBadge from '@/components/sidebar/DemoBadge';
import {
  ChevronDown,
  LogOut,
  Menu,
  Plus,
  Settings,
  Upload,
  Sparkles,
  Database,
  Table2,
} from 'lucide-react';
import clsx from 'clsx';

interface TopBarProps {
  onMenuClick: () => void;
  onOpenSemanticCorrections: () => void;
  onOpenDatasetSheet: () => void;
}

export default function TopBar({
  onMenuClick,
  onOpenSemanticCorrections,
  onOpenDatasetSheet,
}: TopBarProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { datasets, activeDataset, setActiveDataset } = useDatasets();
  const { createNewConversation } = useConversation();
  const { openUploadModal } = useUploadModal();

  const [datasetMenuOpen, setDatasetMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  const datasetRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (datasetRef.current && !datasetRef.current.contains(t)) setDatasetMenuOpen(false);
      if (userRef.current && !userRef.current.contains(t)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleDatasetPick = (d: Dataset) => {
    setActiveDataset(d);
    setDatasetMenuOpen(false);
    router.push('/app');
  };

  const handleNewChat = async () => {
    if (creatingChat) return;
    setCreatingChat(true);
    try {
      const conv = await createNewConversation();
      if (conv) router.push(`/app/${conv.id}`);
    } finally {
      setCreatingChat(false);
    }
  };

  const initials = (user?.email?.substring(0, 2) ?? 'U').toUpperCase();

  return (
    <header
      className="relative z-[70] flex h-14 shrink-0 items-center gap-3 px-3 md:px-4"
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'rgba(10, 13, 20, 0.88)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/5 hover:text-white md:hidden"
        aria-label="Open conversations"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Logo */}
      <Link
        href="/app"
        className="group shrink-0 flex items-center gap-1.5"
      >
        <Sparkles className="h-4 w-4 text-brand-indigo-light opacity-70 group-hover:opacity-100 transition-opacity" />
        <span className="text-sm font-bold tracking-tight text-white md:text-base">
          G.I.N.A
        </span>
      </Link>

      {/* Dataset switcher */}
      <div className="relative min-w-0 flex-1" ref={datasetRef}>
        <button
          type="button"
          onClick={() => setDatasetMenuOpen((o) => !o)}
          disabled={datasets.length === 0}
          className={clsx(
            'flex w-full max-w-md items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm text-slate-200 transition-all duration-200',
            'border-white/8 bg-white/4',
            datasets.length === 0
              ? 'cursor-not-allowed opacity-50'
              : 'hover:border-brand-indigo/35 hover:bg-white/6 hover:shadow-[0_0_0_1px_rgba(90,78,227,0.12)] focus:outline-none',
          )}
        >
          <span className="min-w-0 flex-1 truncate font-medium">
            {activeDataset?.name ?? 'Choose a dataset'}
          </span>
          {activeDataset?.isDemo && <DemoBadge />}
          <ChevronDown
            className={clsx(
              'h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200',
              datasetMenuOpen && 'rotate-180',
            )}
          />
        </button>

        {datasetMenuOpen && datasets.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full z-[60] mt-1.5 max-h-72 overflow-auto rounded-xl border border-white/8 py-1.5 shadow-2xl"
            style={{
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              background: 'rgba(18, 22, 32, 0.95)',
            }}
          >
            {datasets.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => handleDatasetPick(d)}
                className={clsx(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-all duration-150',
                  activeDataset?.id === d.id
                    ? 'bg-brand-indigo/15 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white',
                )}
              >
                {d.isDemo ? (
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-cyan opacity-70" />
                ) : (
                  <Database className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                )}
                <span className="min-w-0 flex-1 truncate">{d.name}</span>
                {d.isDemo && <DemoBadge />}
                {activeDataset?.id === d.id && (
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-indigo shrink-0" />
                )}
              </button>
            ))}
            <div
              className="my-1.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            />
            <button
              type="button"
              onClick={() => {
                setDatasetMenuOpen(false);
                onOpenSemanticCorrections();
              }}
              disabled={!activeDataset}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-400 transition-all duration-150 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Settings className="h-3.5 w-3.5 shrink-0" />
              Semantic corrections
            </button>
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {/* New Chat — mobile icon only */}
        <button
          type="button"
          onClick={() => void handleNewChat()}
          disabled={creatingChat || !activeDataset}
          className="btn-press flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 sm:hidden btn-glow"
          aria-label="New chat"
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* New Chat — desktop */}
        <button
          type="button"
          onClick={() => void handleNewChat()}
          disabled={creatingChat || !activeDataset}
          className="btn-press btn-glow hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
        >
          {creatingChat ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New chat
        </button>

        {/* Dataset table preview */}
        <button
          type="button"
          onClick={onOpenDatasetSheet}
          disabled={!activeDataset}
          className="btn-press flex h-9 w-9 items-center justify-center rounded-lg border text-slate-300 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2"
          style={{ borderColor: 'rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)' }}
          title="View uploaded data"
          aria-label="View uploaded data as table"
        >
          <Table2 className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline text-xs font-medium">Data</span>
        </button>

        {/* Upload */}
        <button
          type="button"
          onClick={openUploadModal}
          className="btn-press flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-slate-300 transition-all duration-200"
          style={{ borderColor: 'rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(90,78,227,0.45)';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(90,78,227,0.08)';
            (e.currentTarget as HTMLButtonElement).style.color = 'white';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.10)';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
            (e.currentTarget as HTMLButtonElement).style.color = '';
          }}
        >
          <Upload className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        {/* Avatar / profile */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="btn-press flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #5A4EE3, #3CE0D6)',
              boxShadow: userMenuOpen
                ? '0 0 0 3px rgba(90,78,227,0.35), 0 0 0 1px rgba(60,224,214,0.2)'
                : '0 0 0 2px rgba(90,78,227,0.20)',
            }}
            aria-label="Account menu"
          >
            {initials}
          </button>
          {userMenuOpen && (
            <div
              className="absolute right-0 top-full z-[60] mt-2 w-60 overflow-hidden rounded-xl border border-white/8 shadow-2xl"
              style={{
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                background: 'rgba(18, 22, 32, 0.97)',
              }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #5A4EE3, #3CE0D6)' }}
                  >
                    {initials}
                  </div>
                  <p className="min-w-0 truncate text-sm text-slate-200">{user?.email ?? 'Signed in'}</p>
                </div>
              </div>
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    void signOut();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 transition-colors duration-150 hover:bg-white/5 hover:text-white"
                >
                  <LogOut className="h-4 w-4 text-slate-500" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
