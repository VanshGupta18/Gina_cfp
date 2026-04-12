'use client';

import React from 'react';

export function FollowUpSuggestions({ suggestions }: { suggestions: string[] }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wider text-slate-500 mb-2 uppercase">Follow-up suggestions</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => {
              // We dispatch a custom event to the chat input to pick this up,
              // or handle via context in a larger app.
              const event = new CustomEvent('ttd:fill-chat', { detail: suggestion });
              window.dispatchEvent(event);
            }}
            className="px-3 py-1.5 rounded-full border border-surface-border bg-surface hover:bg-surface-tertiary transition-colors text-xs text-brand-teal-light text-left"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
