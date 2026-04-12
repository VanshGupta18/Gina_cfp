'use client';

import { useState } from 'react';
import { Message, OutputPayload, PipelineStep } from '@/types';
import { ThinkingPill } from './ThinkingPill';
import { PipelineTrace } from './PipelineTrace';
import { OutputCard } from '@/components/output/OutputCard';

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
    <div className="flex justify-start mb-4">
      <div className="max-w-2xl space-y-4">
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
          <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-surface-border text-slate-300 text-sm">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}
