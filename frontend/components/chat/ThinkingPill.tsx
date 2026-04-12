'use client';

import { useState, useEffect } from 'react';
import { PipelineTrace } from './PipelineTrace';
import { PipelineStep } from '@/types';
import { Sparkles, ChevronDown } from 'lucide-react';
import { useReasoningToggle } from '@/lib/hooks/useReasoningToggle';

export interface ThinkingPillProps {
  steps: PipelineStep[];
  defaultExpanded?: boolean;
}

export function ThinkingPill({ steps, defaultExpanded = false }: ThinkingPillProps) {
  const { showReasoning, setReasoning } = useReasoningToggle();
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const handleToggle = () => {
    const nextState = !expanded;
    setExpanded(nextState);
    if (nextState) {
      setReasoning(true); // Auto-enable global reasoning if user expands
    } else {
      setReasoning(false); // Disable global reasoning if user hides it
    }
  };

  return (
    <div className="flex flex-col gap-4 mb-4">
      <button
        onClick={handleToggle}
        className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-surface-secondary border border-[#2A303C] hover:bg-[#252B3A] transition-colors w-fit shadow-sm group"
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-brand-indigo/20 flex items-center justify-center shrink-0 group-hover:bg-brand-indigo/30 transition-colors">
            <Sparkles className="w-3.5 h-3.5 text-brand-indigo animate-pulse" />
          </div>
          <span className="text-sm font-medium text-slate-300">Thinking...</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="pl-4">
          <PipelineTrace steps={steps} />
        </div>
      )}
    </div>
  );
}
