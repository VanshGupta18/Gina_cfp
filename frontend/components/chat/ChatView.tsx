'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useConversation } from '@/lib/hooks/useConversation';
import { useDatasets } from '@/lib/hooks/useDatasets';
import { usePipeline } from '@/lib/hooks/usePipeline';
import { useReasoningToggle } from '@/lib/hooks/useReasoningToggle';
import { buildSessionContextFromMessages } from '@/lib/chat/sessionContext';
import DemoBadge from '@/components/sidebar/DemoBadge';
import { CorrectionModal } from '@/components/upload/CorrectionModal';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { ReasoningToggle } from './ReasoningToggle';

export function ChatView() {
  const { activeDataset, refreshDatasets } = useDatasets();
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const { activeConversation, messages, addMessage } = useConversation();
  const { steps, result, isStreaming, error, runQuery } = usePipeline();
  const { showReasoning, toggleReasoning, mounted: reasoningMounted } = useReasoningToggle();

  const sessionContextForNextQuery = useMemo(
    () => buildSessionContextFromMessages(messages),
    [messages]
  );

  const canEditSemantic =
    !!activeDataset && !activeDataset.isDemo;

  const openCorrections = () => setCorrectionModalOpen(true);

  const lastAppendedResultKey = useRef<string | null>(null);

  // When streaming ends, add assistant message if result exists
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
    }
  }, [isStreaming, result, activeConversation, addMessage]);

  if (!activeDataset) {
    return (
      <div className="h-full flex items-center justify-center text-center text-slate-400">
        <p>Select a dataset to start chatting</p>
      </div>
    );
  }

  if (!activeConversation) {
    return (
      <div className="h-full flex items-center justify-center text-center text-slate-400">
        <p>Select a conversation or create a new one</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-surface-border bg-surface px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-200">
            {activeConversation.title}
          </h2>
          {activeDataset.isDemo && <DemoBadge />}
        </div>

        {/* Reasoning Toggle (top right) */}
        <div className="flex items-center gap-2 shrink-0">
          {canEditSemantic && (
            <button
              type="button"
              onClick={openCorrections}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-surface-secondary text-slate-300 border border-surface-border hover:border-brand-teal/50 hover:text-slate-100 transition-colors"
              title="Edit how columns are interpreted for this dataset"
            >
              Column understanding
            </button>
          )}
          <ReasoningToggle
            showReasoning={showReasoning}
            onToggle={toggleReasoning}
            mounted={reasoningMounted}
          />
        </div>
      </div>

      {/* Messages Area */}
      <MessageList>
        {messages.map((msg, idx) => (
          <div key={msg.id || idx}>
            {msg.role === 'user' ? (
              <UserMessage text={msg.content} />
            ) : (
              <AssistantMessage
                message={msg}
                steps={steps}
                output={result}
                isStreaming={isStreaming && idx === messages.length - 1}
                showReasoning={showReasoning}
                onCorrectionClick={canEditSemantic ? openCorrections : undefined}
              />
            )}
          </div>
        ))}

        {/* Show streaming indicator if query is running but no messages yet */}
        {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
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
        )}

        {/* Error display */}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
            {error}
          </div>
        )}
      </MessageList>

      {/* Chat Input */}
      <ChatInput
        isStreaming={isStreaming}
        sessionContext={sessionContextForNextQuery}
        onSubmit={async (payload) => {
          // Add user message to conversation
          addMessage({
            id: `msg-${Date.now()}`,
            conversationId: activeConversation.id,
            role: 'user',
            content: payload.question,
            createdAt: new Date().toISOString(),
          });

          // Run query
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
