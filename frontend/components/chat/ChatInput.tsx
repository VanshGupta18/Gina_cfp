'use client';

import { useState } from 'react';
import { QueryPayload } from '@/types';
import { useConversation } from '@/lib/hooks/useConversation';

export interface ChatInputProps {
  isStreaming: boolean;
  onSubmit: (payload: QueryPayload) => void;
}

export function ChatInput({
  isStreaming,
  onSubmit,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const { activeConversation } = useConversation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || !activeConversation) return;

    const userQuery = input.trim();
    setInput('');

    const payload: QueryPayload = {
      conversationId: activeConversation.id,
      datasetId: activeConversation.datasetId,
      question: userQuery,
      sessionContext: {
        lastExchanges: [],
      },
    };

    onSubmit(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-surface-border bg-surface p-4 flex gap-3"
    >
      <input
        type="text"
        placeholder="Ask a question about your data..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isStreaming}
        className="flex-1 px-4 py-2 rounded-lg bg-surface-secondary border border-surface-border text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-teal disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={isStreaming || !input.trim() || !activeConversation}
        className="px-6 py-2 rounded-lg bg-brand-teal text-white font-medium hover:bg-brand-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isStreaming ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
