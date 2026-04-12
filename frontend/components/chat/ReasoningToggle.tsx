'use client';

import { useReasoningToggle } from '@/lib/hooks/useReasoningToggle';

export function ReasoningToggle() {
  const { showReasoning, toggleReasoning, mounted } = useReasoningToggle();

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <button
      onClick={toggleReasoning}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        showReasoning
          ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/20'
          : 'bg-surface-secondary text-slate-400 border border-surface-border hover:border-slate-600'
      }`}
      title={showReasoning ? 'Hide reasoning steps' : 'Show reasoning steps'}
    >
      <span className="flex items-center gap-2">
        <span className="text-xs">Show Reasoning</span>
        <span className={`w-4 h-4 rounded-full transition-all ${showReasoning ? 'bg-white' : 'bg-slate-600'}`} />
      </span>
    </button>
  );
}
