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
import { Sparkles, Bell, Settings } from 'lucide-react';

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
    <div className="flex flex-col relative h-full bg-[#0F121A]">
      {/* Chat Header */}
      <div className="border-b border-surface-border bg-[#0F121A] px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold font-serif text-white tracking-wide">
            {activeDataset.name}
          </h2>
          {activeDataset.isDemo && <DemoBadge />}
        </div>

        {/* Reasoning Toggle & Top Actions */}
        <div className="flex items-center gap-6 shrink-0">
          <ReasoningToggle
            showReasoning={showReasoning}
            onToggle={toggleReasoning}
            mounted={reasoningMounted}
          />
          <div className="w-px h-5 bg-surface-border"></div>
          <button className="text-slate-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="text-slate-400 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto pb-32">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-14 h-14 rounded-2xl bg-brand-indigo flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(90,78,227,0.3)]">
              <Sparkles className="w-7 h-7 text-white fill-white" />
            </div>
            <h1 className="text-3xl font-bold font-serif text-white mb-4 text-center">
              Ask a question about {activeDataset.name}
            </h1>
            <p className="text-sm text-slate-400 mb-10 text-center">
              Try one of these to get started:
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                'What was the total spend in Q1?',
                'Show me top categories by amount',
                'Which grants were over £10,000?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    const payload: QueryPayload = {
                      conversationId: activeConversation.id,
                      datasetId: activeConversation.datasetId,
                      question: suggestion,
                      sessionContext: sessionContextForNextQuery,
                    };
                    addMessage({
                      id: `msg-${Date.now()}`,
                      conversationId: activeConversation.id,
                      role: 'user',
                      content: suggestion,
                      createdAt: new Date().toISOString(),
                    });
                    void runQuery(payload);
                  }}
                  className="px-5 py-2.5 rounded-full bg-surface-secondary border border-surface-border text-sm font-medium text-slate-300 hover:bg-surface-tertiary hover:text-white transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <MessageList>
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className="max-w-4xl mx-auto py-4">
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
              <div className="max-w-4xl mx-auto py-4">
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
