'use client';

import React from 'react';
import type { Dataset } from '@/types';

interface SidebarHeaderActionsProps {
  onNewChat: () => void;
  onUpload: () => void;
  activeDataset: Dataset | null;
  isCreatingChat: boolean;
  onViewDataset?: () => void;
  onSemanticCorrections?: () => void;
}

export function SidebarHeaderActions({
  onNewChat,
  onUpload,
  activeDataset,
  isCreatingChat,
  onViewDataset,
  onSemanticCorrections,
}: SidebarHeaderActionsProps) {
  const canCreateChat = activeDataset !== null;
  const canDatasetTools = activeDataset !== null;
  const canCorrections = canDatasetTools && activeDataset && !activeDataset.isDemo;

  return (
    <div
      className="px-4 py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex flex-col gap-2">
        {/* New Chat Button */}
        <button
          type="button"
          onClick={onNewChat}
          disabled={!canCreateChat || isCreatingChat}
          className={`
            inline-flex items-center justify-center rounded-lg px-3 py-1.5
            text-xs font-medium transition-all
            ${
              canCreateChat && !isCreatingChat
                ? 'bg-brand-indigo text-white hover:bg-brand-indigo-light'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
            }
          `}
          title={canCreateChat ? 'Create a new chat' : 'Select a dataset first'}
        >
          {isCreatingChat ? (
            <>
              <span className="mr-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Creating...
            </>
          ) : (
            <>
              <span className="mr-1">✨</span>
              New Chat
            </>
          )}
        </button>

        {/* Upload Dataset Button */}
        <button
          type="button"
          onClick={onUpload}
          className="inline-flex items-center justify-center rounded-lg border border-brand-indigo/30 px-3 py-1.5 text-xs font-medium text-brand-indigo transition-colors hover:border-brand-indigo/60 hover:bg-brand-indigo/5"
        >
          <span className="mr-1">📤</span>
          Upload Dataset
        </button>

        {canDatasetTools && onViewDataset && (
          <button
            type="button"
            onClick={onViewDataset}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            View data
          </button>
        )}

        {canCorrections && onSemanticCorrections && (
          <button
            type="button"
            onClick={onSemanticCorrections}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-slate-200"
          >
            Semantic corrections
          </button>
        )}
      </div>
    </div>
  );
}
