'use client';

import React from 'react';
import type { Conversation, Dataset } from '@/types';
import { ChatNodeList } from './ChatNodeList';
import { SidebarErrorState } from './SidebarErrorState';

interface DatasetNodeProps {
  dataset: Dataset;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  chats: Conversation[] | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectChat: (conversation: Conversation) => void;
  activeConversation: Conversation | null;
  isCreatingChat: boolean;
}

function SkeletonChatItem() {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 rounded-lg">
      <div className="h-1.5 w-1.5 rounded-full skeleton-line shrink-0" />
      <div className="skeleton-line h-3 flex-1 rounded" />
    </div>
  );
}

export function DatasetNode({
  dataset,
  isActive,
  isExpanded,
  onToggle,
  onSelect,
  chats,
  isLoading,
  error,
  onRetry,
  onSelectChat,
  activeConversation,
  isCreatingChat,
}: DatasetNodeProps) {
  const handleClick = () => {
    // If clicking inactive dataset, select it. If already active, just toggle expand.
    if (!isActive) {
      onSelect();
    }
    onToggle();
  };

  return (
    <div>
      {/* Dataset Row */}
      <button
        type="button"
        onClick={handleClick}
        className={`
          flex w-full items-center gap-2 rounded-lg px-3 py-2.5 mx-1 text-sm font-medium
          transition-colors
          ${
            isActive
              ? 'bg-brand-indigo/15 text-brand-indigo'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-300'
          }
        `}
      >
        {/* Expand/Collapse Chevron */}
        <span
          className={`
            shrink-0 text-xs transition-transform duration-200
            ${isExpanded ? 'rotate-90' : 'rotate-0'}
          `}
        >
          ▶
        </span>

        {/* Dataset Name */}
        <span className="flex-1 truncate text-left">{dataset.name}</span>

        {/* Row/Column Count Badges */}
        <div className="flex shrink-0 gap-1 text-[10px] text-slate-500">
          {dataset.rowCount !== null && (
            <span>{dataset.rowCount.toLocaleString()} rows</span>
          )}
          {dataset.columnCount !== null && (
            <span>• {dataset.columnCount} cols</span>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="ml-2">
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-1 pt-1">
              <SkeletonChatItem />
              <SkeletonChatItem />
              <SkeletonChatItem />
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="pt-1">
              <SidebarErrorState error={error} onRetry={onRetry} />
            </div>
          )}

          {/* Chats List */}
          {!isLoading && !error && chats !== null && (
            <ChatNodeList
              chats={chats}
              activeConversation={activeConversation}
              onSelectChat={onSelectChat}
              datasetId={dataset.id}
              isCreatingChat={isCreatingChat}
              showEmptyPrompt
            />
          )}
        </div>
      )}
    </div>
  );
}
