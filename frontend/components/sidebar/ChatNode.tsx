'use client';

import React, { useMemo } from 'react';
import type { Conversation } from '@/types';

interface ChatNodeProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  showRelativeTime?: boolean;
}

/**
 * Format relative time (e.g., "2d ago", "1h ago", "just now")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return 'just now';
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) return `${daysAgo}d ago`;
  const weeksAgo = Math.floor(daysAgo / 7);
  if (weeksAgo < 4) return `${weeksAgo}w ago`;
  
  // Fallback to date format
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ChatNode({ conversation, isActive, onClick, showRelativeTime = true }: ChatNodeProps) {
  const relativeTime = useMemo(() => formatRelativeTime(conversation.updatedAt), [conversation.updatedAt]);
  
  const title = conversation.title || 'Untitled Chat';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm
        transition-colors
        ${
          isActive
            ? 'bg-brand-indigo/15 text-brand-indigo'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-300'
        }
      `}
    >
      <span className="flex-1 truncate text-left">{title}</span>
      {showRelativeTime && (
        <span className="shrink-0 text-[11px] text-slate-500">{relativeTime}</span>
      )}
    </button>
  );
}
