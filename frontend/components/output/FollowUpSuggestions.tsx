'use client';

import React, { memo } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

function FollowUpSuggestionsImpl({ suggestions }: { suggestions: string[] }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-3.5 h-3.5 text-brand-indigo" />
        <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">Suggested Follow-ups</p>
      </div>
      <div className="flex flex-col gap-2">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => {
              // Dispatch event for ChatView to catch and auto-run
              const event = new CustomEvent('ttd:submit-chat', { detail: suggestion });
              window.dispatchEvent(event);
            }}
            className="group flex items-center justify-between px-4 py-3 rounded-xl border border-surface-border bg-surface hover:border-brand-indigo/50 hover:bg-[#1C212E] transition-all text-left"
          >
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
              {suggestion}
            </span>
            <div className="w-6 h-6 rounded-full bg-brand-indigo/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
               <ArrowRight className="w-3 h-3 text-brand-indigo" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export const FollowUpSuggestions = memo(FollowUpSuggestionsImpl);
