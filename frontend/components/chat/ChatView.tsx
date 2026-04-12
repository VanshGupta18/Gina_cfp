'use client';

import { useEffect, useMemo } from 'react';
import { useConversation } from '@/lib/hooks/useConversation';
import { useDatasets } from '@/lib/hooks/useDatasets';
import { usePipeline } from '@/lib/hooks/usePipeline';
import { useReasoningToggle } from '@/lib/hooks/useReasoningToggle';
import DemoBadge from '@/components/sidebar/DemoBadge';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { ReasoningToggle } from './ReasoningToggle';

export function ChatView() {
  const { activeDataset } = useDatasets();
  const { activeConversation, messages, addMessage } = useConversation();
  const { steps, result, isStreaming, error, runQuery } = usePipeline();
  const { showReasoning } = useReasoningToggle();

  // Build session context from last 3 Q&A exchanges + last result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    const exchanges = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-6) // Last 3 exchanges = 6 messages
      .reduce(
        (acc, msg, idx, arr) => {
          if (msg.role === 'user') {
            const nextMsg = arr[idx + 1];
            if (nextMsg && nextMsg.role === 'assistant') {
              acc.push({
                userQuestion: msg.content,
                assistantResponse: nextMsg.content,
              });
            }
          }
          return acc;
        },
        [] as Array<{ userQuestion: string; assistantResponse: string }>
      );

    return {
      lastExchanges: exchanges,
      lastResultSet: undefined,
    };
  }, [messages, result]);

  // When streaming ends, add assistant message if result exists
  useEffect(() => {
    if (!isStreaming && result && activeConversation) {
      addMessage({
        id: `msg-${Date.now()}`,
        conversationId: activeConversation.id,
        role: 'assistant',
        content: '', // Content will be rendered from OutputCard in Phase 6
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
        <ReasoningToggle />
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
    </div>
  );
}
