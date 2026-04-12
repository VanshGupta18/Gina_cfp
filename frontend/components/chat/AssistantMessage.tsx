'use client';

import { useState } from 'react';
import { Message, OutputPayload, PipelineStep } from '@/types';
import { ThinkingPill } from './ThinkingPill';
import { PipelineTrace } from './PipelineTrace';
import { OutputCard } from '@/components/output/OutputCard';
import { Bot } from 'lucide-react';

export interface AssistantMessageProps {
  message: Message;
  steps?: PipelineStep[];
  output?: OutputPayload | null;
  isStreaming?: boolean;
  showReasoning?: boolean;
  onCorrectionClick?: () => void;
}

export function AssistantMessage({
  message,
  steps = [],
  output,
  isStreaming = false,
  showReasoning = false,
  onCorrectionClick,
}: AssistantMessageProps) {
  const [localShowTrace, setLocalShowTrace] = useState(false);

  const shouldShowTrace = showReasoning || localShowTrace;

  return (
    <div className="flex justify-start mb-6">
      <div className="w-full space-y-4">
        {/* While streaming, either show the trace (if enabled) or the pill */}
        {isStreaming && (
          shouldShowTrace ? (
            <PipelineTrace steps={steps} />
          ) : (
            <ThinkingPill
              steps={steps}
              onExpandChange={setLocalShowTrace}
            />
          )
        )}

        {/* Show output card when streaming ends */}
        {!isStreaming && output && (
          <OutputCard payload={output} onCorrectionClick={onCorrectionClick} />
        )}

        {/* Fallback: just show message content */}
        {!isStreaming && !output && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-surface-secondary border border-surface-border flex items-center justify-center shrink-0">
               <Bot className="w-5 h-5 text-slate-400" />
            </div>
            <div className="px-6 py-4 rounded-xl bg-surface-secondary border border-surface-border text-slate-300 text-sm shadow-sm grow-0 mr-auto max-w-[800px]">
              {message.content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
