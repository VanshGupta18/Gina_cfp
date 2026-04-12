'use client';

import { useState } from 'react';
import { PipelineTrace } from './PipelineTrace';
import { PipelineStep } from '@/types';

export interface ThinkingPillProps {
  steps: PipelineStep[];
  onExpandChange?: (expanded: boolean) => void;
}

export function ThinkingPill({ steps, onExpandChange }: ThinkingPillProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    onExpandChange?.(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-secondary border border-surface-border hover:bg-surface transition-colors w-fit text-sm text-slate-300"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-teal animate-pulse"></div>
          <span>Thinking...</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {expanded && <PipelineTrace steps={steps} />}
    </div>
  );
}
