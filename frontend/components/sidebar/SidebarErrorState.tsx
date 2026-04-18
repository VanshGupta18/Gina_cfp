'use client';

import React from 'react';

interface SidebarErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function SidebarErrorState({ error, onRetry }: SidebarErrorStateProps) {
  return (
    <div className="mx-2 space-y-2">
      <div
        className="rounded-lg px-3 py-2 text-xs text-red-300"
        style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
      >
        {error}
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="text-xs text-brand-indigo underline transition-colors hover:text-brand-indigo-light"
      >
        Retry
      </button>
    </div>
  );
}
