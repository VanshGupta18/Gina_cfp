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
import type { QueryPayload, StarterQuestionItem } from '@/types';
import { getStarterQuestions } from '@/lib/api/datasets';

/** Local fallback if the starter-questions API fails — generic, no spending/amount assumptions. */
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

  const sessionContextForNextQuery = useMemo(
    () => buildSessionContextFromMessages(messages),
    [messages]
  );

  const canEditSemantic =
    !!activeDataset && !activeDataset.isDemo;

  const openCorrections = () => setCorrectionModalOpen(true);

  const lastAppendedResultKey = useRef<string | null>(null);

  /** `undefined` = still loading; then API or static fallback */
  const [starterQuestions, setStarterQuestions] = useState<StarterQuestionItem[] | undefined>(undefined);

  // Load contextual empty-chat starters (same pipeline idea as follow-up suggestions)
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
      // Backend sets title from first question when title IS NULL — refresh list so sidebar/header match
      void refreshConversations();
    }
  }, [isStreaming, result, activeConversation, addMessage, refreshConversations]);

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
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto px-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Pulsing GINA icon */}
            <div className="relative mb-6 mt-16">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #5A4EE3, #8C52FF)',
                  boxShadow: '0 0 30px rgba(90,78,227,0.35)',
                  animation: 'pulse-ring 2.5s ease-out infinite',
                }}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#0F121A] p-1.5 rounded-xl">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-cyan animate-pulse" />
              </div>
            </div>

            <h1 className="text-4xl font-bold font-serif text-white mb-4 text-center tracking-wide">
              Analyze{' '}
              <span className="text-shimmer">{activeDataset.name}</span>
            </h1>
            <p className="text-sm text-slate-500 mb-12 text-center max-w-xl leading-relaxed">
              I&apos;m G.I.N.A., your AI data analyst. I can generate SQL queries, render interactive charts,
              and uncover hidden insights instantly. Try one of the actions below to begin exploring this dataset:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {starterQuestions === undefined
                ? [0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex flex-col items-start px-5 py-4 rounded-xl border border-white/[0.07] bg-[rgba(20,24,34,0.6)] animate-pulse min-h-[108px] w-full"
                      aria-hidden
                    >
                      <span className="h-3 w-24 rounded bg-slate-700/90 mb-3" />
                      <span className="h-3 w-full max-w-[280px] rounded bg-slate-700/70 mb-2" />
                      <span className="h-3 w-[85%] rounded bg-slate-700/50" />
                    </div>
                  ))
                : starterQuestions.map((item, idx) => (
                    <button
                      key={`${idx}-${item.question.slice(0, 48)}`}
                      type="button"
                      onClick={() => {
                        const payload: QueryPayload = {
                          conversationId: activeConversation.id,
                          datasetId: activeConversation.datasetId,
                          question: item.question,
                          sessionContext: sessionContextForNextQuery,
                        };
                        addMessage({
                          id: `msg-${Date.now()}`,
                          conversationId: activeConversation.id,
                          role: 'user',
                          content: item.question,
                          createdAt: new Date().toISOString(),
                        });
                        void runQuery(payload);
                      }}
                      className="group relative flex flex-col items-start px-5 py-4 rounded-xl text-left transition-all duration-200 overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, rgba(20,24,34,0.9), rgba(28,33,46,0.7))',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.borderColor = 'rgba(90,78,227,0.45)';
                        el.style.background =
                          'linear-gradient(135deg, rgba(90,78,227,0.10), rgba(28,33,46,0.8))';
                        el.style.transform = 'translateY(-2px)';
                        el.style.boxShadow =
                          '0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(90,78,227,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.borderColor = 'rgba(255,255,255,0.07)';
                        el.style.background =
                          'linear-gradient(135deg, rgba(20,24,34,0.9), rgba(28,33,46,0.7))';
                        el.style.transform = '';
                        el.style.boxShadow = '';
                      }}
                    >
                      <span className="text-xs font-bold tracking-widest text-brand-indigo group-hover:text-brand-indigo-light mb-1.5 uppercase flex items-center gap-2 transition-colors duration-150">
                        <span className="w-1 h-1 rounded-full bg-brand-cyan opacity-70 shrink-0" />
                        {item.title}
                      </span>
                      <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors duration-150 leading-snug pr-6">
                        &ldquo;{item.question}&rdquo;
                      </span>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-indigo-light opacity-0 group-hover:opacity-100 transition-all duration-150 translate-x-[-4px] group-hover:translate-x-0 font-medium">
                        →
                      </span>
                    </button>
                  ))}
            </div>
          </div>
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
