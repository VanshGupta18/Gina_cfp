'use client';

import React from 'react';
import { Sidebar, Sparkles, Upload } from 'lucide-react';
import type { Dataset } from '@/types';

interface SidebarHeaderActionsProps {
  onNewChat: () => void;
  onUpload: () => void;
  activeDataset: Dataset | null;
  isCreatingChat: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SidebarHeaderActions({
  onNewChat,
  onUpload,
  activeDataset,
  isCreatingChat,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarHeaderActionsProps) {
  const canCreateChat = activeDataset !== null;

  return (
    <div
      className="flex flex-col gap-2 py-3 px-2"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Collapse/Expand Toggle Button - Always visible, always on top */}
      {onToggleCollapse && (
        <>
          {!isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="inline-flex items-center justify-center rounded-lg border border-slate-500/30 px-3 py-1.5 text-xs font-medium text-slate-400 transition-all duration-200 hover:border-slate-500/60 hover:bg-slate-500/5 hover:text-slate-300"
              title="Collapse sidebar"
            >
              <Sidebar className="h-3.5 w-3.5 mr-1.5" />
              Hide
            </button>
          )}

          {isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-slate-300 hover:bg-white/10 transition-all duration-200 mx-auto"
              title="Expand sidebar"
            >
              <Sidebar className="h-4 w-4" />
            </button>
          )}
        </>
      )}

      {!isCollapsed && (
        <div className="flex flex-col gap-2">
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
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                New Chat
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onUpload}
            className="inline-flex items-center justify-center rounded-lg border border-brand-indigo/30 px-3 py-1.5 text-xs font-medium text-brand-indigo transition-colors hover:border-brand-indigo/60 hover:bg-brand-indigo/5"
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            Upload Dataset
          </button>
        </div>
      )}

      {isCollapsed && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onNewChat}
            disabled={!canCreateChat || isCreatingChat}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-brand-indigo hover:bg-white/10 disabled:opacity-50 mx-auto transition-all duration-200"
            title="New Chat"
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onUpload}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-brand-indigo hover:bg-white/10 mx-auto transition-all duration-200"
            title="Upload Dataset"
          >
            <Upload className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
