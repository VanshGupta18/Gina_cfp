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
import { DatasetWelcome } from './DatasetWelcome';
import { ConversationWelcome } from './ConversationWelcome';

export function ChatView() {
  const { activeDataset, refreshDatasets } = useDatasets();
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const { activeConversation, messages, addMessage, isNewlyCreatedConversation } = useConversation();
  const { steps, result, isStreaming, error, runQuery } = usePipeline();
  const { showReasoning } = useReasoningToggle();

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

  // Listen for auto-submit from follow-up suggestions
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
        {/* Chat Header — glassmorphic */}
        <div
          className="px-8 py-4 flex items-center justify-between sticky top-0 z-20"
          style={{
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            background: 'rgba(10, 12, 18, 0.82)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold font-serif text-white tracking-wide">
              {activeDataset.name}
            </h2>
            {activeDataset.isDemo && <DemoBadge />}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto pb-32">
          <DatasetWelcome dataset={activeDataset} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col relative h-full bg-[#0F121A]">
      {/* Chat Header — glassmorphic */}
      <div
        className="px-8 py-4 flex items-center justify-between sticky top-0 z-20"
        style={{
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: 'rgba(10, 12, 18, 0.82)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold font-serif text-white tracking-wide">
            {activeDataset.name}
          </h2>
          {activeDataset.isDemo && <DemoBadge />}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto pb-32">
        {/* 1. Newly created conversation (empty, just made) → ConversationWelcome */}
        {isNewlyCreatedConversation ? (
          <ConversationWelcome 
            conversationId={activeConversation.id}
            datasetId={activeConversation.datasetId}
          />
        ) : (
          /* 2. Existing conversation → MessageList with messages */
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

            {/* Show streaming indicator if query is running but no messages yet */}
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

            {/* Error display */}
            {error && (
              <div className="max-w-4xl mx-auto px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
                {error}
              </div>
            )}
          </MessageList>
        )}
      </div>

      {/* Chat Input Fixed at Bottom */}
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
