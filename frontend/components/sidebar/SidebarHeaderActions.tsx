'use client';

import React from 'react';
import type { Dataset } from '@/types';

interface SidebarHeaderActionsProps {
  onNewChat: () => void;
  onUpload: () => void;
  activeDataset: Dataset | null;
  isCreatingChat: boolean;
}

export function SidebarHeaderActions({
  onNewChat,
  onUpload,
  activeDataset,
  isCreatingChat,
}: SidebarHeaderActionsProps) {
  const canCreateChat = activeDataset !== null;

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
      </div>
    </div>
  );
}
