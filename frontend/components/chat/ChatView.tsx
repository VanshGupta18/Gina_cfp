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
import { Sparkles } from 'lucide-react';
import type { QueryPayload } from '@/types';

export function ChatView() {
  const { activeDataset, refreshDatasets } = useDatasets();
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const { activeConversation, messages, addMessage } = useConversation();
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
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto pb-32">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto px-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative mb-6 mt-16">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-indigo to-brand-purple flex items-center justify-center shadow-[0_0_30px_rgba(90,78,227,0.3)]">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#0F121A] p-1.5 rounded-xl">
                 <div className="w-2.5 h-2.5 rounded-full bg-brand-cyan animate-pulse" />
              </div>
            </div>
            <h1 className="text-4xl font-bold font-serif text-white mb-4 text-center tracking-wide">
              Analyze <span className="text-brand-cyan">{activeDataset.name}</span>
            </h1>
            <p className="text-sm text-slate-400 mb-12 text-center max-w-xl leading-relaxed">
              I'm G.I.N.A., your AI data analyst. I can generate SQL queries, render interactive charts, and uncover hidden insights instantly. Try one of the actions below to begin exploring this dataset:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {[
                { title: 'Overview', q: 'What is the overall summary of this dataset?' },
                { title: 'Top Spend', q: 'Show me the top 5 categories by amount spent' },
                { title: 'Time Series', q: 'Show me the spending trend over time as a line chart' },
                { title: 'Outliers', q: 'Are there any unusual spikes or outliers in the data?' },
              ].map((item) => (
                <button
                  key={item.q}
                  onClick={() => {
                    const payload: QueryPayload = {
                      conversationId: activeConversation.id,
                      datasetId: activeConversation.datasetId,
                      question: item.q,
                      sessionContext: sessionContextForNextQuery,
                    };
                    addMessage({
                      id: `msg-${Date.now()}`,
                      conversationId: activeConversation.id,
                      role: 'user',
                      content: item.q,
                      createdAt: new Date().toISOString(),
                    });
                    void runQuery(payload);
                  }}
                  className="group flex flex-col items-start px-5 py-4 rounded-xl bg-surface-secondary border border-surface-border text-left hover:border-brand-indigo/50 hover:bg-[#1C212E] transition-all"
                >
                  <span className="text-xs font-bold tracking-widest text-brand-indigo group-hover:text-brand-indigo-light mb-1 uppercase">
                    {item.title}
                  </span>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                    "{item.q}"
                  </span>
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
