'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useConversation } from '@/lib/hooks/useConversation';
import { useDatasets } from '@/lib/hooks/useDatasets';
import { usePipeline } from '@/lib/hooks/usePipeline';
import { useReasoningToggle } from '@/lib/hooks/useReasoningToggle';
import { buildSessionContextFromMessages } from '@/lib/chat/sessionContext';
import { parseRateLimitError } from '@/lib/api/errors';
import { useDatasetActions } from '@/lib/context/DatasetActionsContext';
import DemoBadge from '@/components/sidebar/DemoBadge';
import { CorrectionModal } from '@/components/upload/CorrectionModal';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { DatasetWelcome } from './DatasetWelcome';
import { ConversationWelcome } from './ConversationWelcome';
import { RateLimitErrorPanel } from './RateLimitErrorPanel';
import type { StarterQuestionItem } from '@/types';
import { getStarterQuestions } from '@/lib/api/datasets';

const STATIC_STARTER_QUESTIONS: StarterQuestionItem[] = [
  { title: 'Overview', question: 'What is this dataset about at a high level?' },
  { title: 'Preview', question: 'Show me the first 15 rows so I can see what the data looks like.' },
  { title: 'Size', question: 'How many rows are in this dataset?' },
  { title: 'Structure', question: 'What columns does this dataset have and what do they represent?' },
];

export function ChatView() {
  const { activeDataset, refreshDatasets } = useDatasets();
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const { activeConversation, messages, addMessage, refreshConversations } = useConversation();
  const { steps, result, isStreaming, error, runQuery } = usePipeline();
  const { showReasoning } = useReasoningToggle();
  const { onViewDataset, onSemanticCorrections } = useDatasetActions();

  const rateLimitInfo = parseRateLimitError(error);

  const sessionContextForNextQuery = useMemo(
    () => buildSessionContextFromMessages(messages),
    [messages],
  );

  const canEditSemantic = !!activeDataset && !activeDataset.isDemo;

  const openCorrections = () => setCorrectionModalOpen(true);

  const lastAppendedResultKey = useRef<string | null>(null);

  const [starterQuestions, setStarterQuestions] = useState<StarterQuestionItem[] | undefined>(
    undefined,
  );

  const handleRetryAfterRateLimit = useCallback(async () => {
    // Retry the last query
    if (messages.length > 0 && activeConversation && activeDataset) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUserMsg) {
        await runQuery({
          conversationId: activeConversation.id,
          datasetId: activeConversation.datasetId,
          question: lastUserMsg.content,
          sessionContext: sessionContextForNextQuery,
        });
      }
    }
  }, [messages, activeConversation, activeDataset, runQuery, sessionContextForNextQuery]);

  useEffect(() => {
    if (!activeConversation || messages.length > 0) {
      setStarterQuestions(undefined);
      return;
    }
    let cancelled = false;
    setStarterQuestions(undefined);
    void getStarterQuestions(activeConversation.datasetId)
      .then((res) => {
        if (cancelled) return;
        const s = res.starters;
        setStarterQuestions(s && s.length > 0 ? s : STATIC_STARTER_QUESTIONS);
      })
      .catch(() => {
        if (!cancelled) setStarterQuestions(STATIC_STARTER_QUESTIONS);
      });
    return () => {
      cancelled = true;
    };
  }, [activeConversation, messages.length]);

  useEffect(() => {
    if (!isStreaming && result && activeConversation) {
      const key = `${activeConversation.id}:${result.messageId}`;
      if (lastAppendedResultKey.current === key) return;
      lastAppendedResultKey.current = key;
      addMessage({
        id: result.messageId,
        conversationId: activeConversation.id,
        role: 'assistant',
        content: result.narrative,
        outputPayload: result,
        createdAt: new Date().toISOString(),
      });
      void refreshConversations();
    }
  }, [isStreaming, result, activeConversation, addMessage, refreshConversations]);

  useEffect(() => {
    const handleAutoSubmit = async (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const question = customEvent.detail;
      if (!activeConversation || isStreaming) return;

      addMessage({
        id: `msg-${Date.now()}`,
        conversationId: activeConversation.id,
        role: 'user',
        content: question,
        createdAt: new Date().toISOString(),
      });

      await runQuery({
        conversationId: activeConversation.id,
        datasetId: activeConversation.datasetId,
        question,
        sessionContext: sessionContextForNextQuery,
      });
    };

    window.addEventListener('ttd:submit-chat', handleAutoSubmit as EventListener);
    return () => {
      window.removeEventListener('ttd:submit-chat', handleAutoSubmit as EventListener);
    };
  }, [activeConversation, isStreaming, sessionContextForNextQuery, runQuery, addMessage]);

  if (!activeDataset) {
    return (
      <div className="h-full flex items-center justify-center text-center text-slate-400">
        <p>Select a dataset to start chatting</p>
      </div>
    );
  }

  if (!activeConversation) {
    return (
      <div className="flex flex-col relative h-full bg-[#0F121A]">
        <div
          className="h-20 px-8 flex items-center justify-between sticky top-0 z-10"
          style={{
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            background: 'rgba(10, 12, 18, 0.82)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold font-serif text-white tracking-wide">{activeDataset.name}</h2>
            {activeDataset.isDemo && <DemoBadge />}
          </div>
          <div className="flex items-center gap-2">
            {onViewDataset && (
              <button
                onClick={onViewDataset}
                className="inline-flex items-center justify-center rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
              >
                View data
              </button>
            )}
            {onSemanticCorrections && !activeDataset.isDemo && (
              <button
                onClick={onSemanticCorrections}
                className="inline-flex items-center justify-center rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
              >
                Semantic Corrections
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-32">
          <DatasetWelcome dataset={activeDataset} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col relative h-full bg-[#0F121A]">
      <div
        className="h-20 px-8 flex items-center justify-between sticky top-0 z-10"
        style={{
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: 'rgba(10, 12, 18, 0.82)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold font-serif text-white tracking-wide">{activeDataset.name}</h2>
          {activeDataset.isDemo && <DemoBadge />}
        </div>
        <div className="flex items-center gap-2">
          {onViewDataset && (
            <button
              onClick={onViewDataset}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              View data
            </button>
          )}
          {onSemanticCorrections && !activeDataset.isDemo && (
            <button
              onClick={onSemanticCorrections}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              Semantic Corrections
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {messages.length === 0 ? (
          <ConversationWelcome
            conversationId={activeConversation.id}
            datasetId={activeConversation.datasetId}
            starters={starterQuestions}
            loading={starterQuestions === undefined}
          />
        ) : (
          <MessageList>
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className="max-w-4xl mx-auto py-4 message-enter">
                {msg.role === 'user' ? (
                  <UserMessage text={msg.content} />
                ) : (
                  <AssistantMessage
                    message={msg}
                    steps={steps}
                    output={isStreaming && idx === messages.length - 1 ? result : msg.outputPayload}
                    isStreaming={isStreaming && idx === messages.length - 1}
                    showReasoning={showReasoning}
                    onCorrectionClick={canEditSemantic ? openCorrections : undefined}
                  />
                )}
              </div>
            ))}

            {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
              <div className="max-w-4xl mx-auto py-4 message-enter">
                <AssistantMessage
                  message={{
                    id: 'streaming',
                    conversationId: activeConversation.id,
                    role: 'assistant',
                    content: 'Thinking...',
                    createdAt: new Date().toISOString(),
                  }}
                  steps={steps}
                  output={null}
                  isStreaming={true}
                  showReasoning={showReasoning}
                  onCorrectionClick={canEditSemantic ? openCorrections : undefined}
                />
              </div>
            )}

            {error && (
              <div className="max-w-4xl mx-auto px-4 py-3">
                {rateLimitInfo ? (
                  <RateLimitErrorPanel
                    retryAfterSeconds={rateLimitInfo.retryAfterSeconds}
                    onRetry={handleRetryAfterRateLimit}
                  />
                ) : (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/50 p-4 text-red-400 text-sm">
                    <p className="font-semibold mb-1">Query Failed</p>
                    <p>{error}</p>
                  </div>
                )}
              </div>
            )}
          </MessageList>
        )}
      </div>

      <ChatInput
        isStreaming={isStreaming}
        sessionContext={sessionContextForNextQuery}
        onSubmit={async (payload) => {
          addMessage({
            id: `msg-${Date.now()}`,
            conversationId: activeConversation.id,
            role: 'user',
            content: payload.question,
            createdAt: new Date().toISOString(),
          });

          await runQuery(payload);
        }}
      />

      {correctionModalOpen && activeDataset && (
        <CorrectionModal
          datasetId={activeDataset.id}
          onClose={() => setCorrectionModalOpen(false)}
          onSuccess={() => {
            setCorrectionModalOpen(false);
            void refreshDatasets();
          }}
        />
      )}
    </div>
  );
}
