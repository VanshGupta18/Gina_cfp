import React from 'react';

export function CitationChips({ citations }: { citations: string[] }) {
  if (!citations || citations.length === 0) return null;
  
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs text-slate-500 font-medium">Based on:</span>
      {citations.map((chip, i) => (
        <span 
          key={i} 
          className="px-2 py-0.5 rounded border border-surface-border bg-surface-secondary text-xs text-slate-400"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}
