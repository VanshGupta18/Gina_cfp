'use client';

import { useState } from 'react';
import { QueryPayload, type SessionContext } from '@/types';
import { useConversation } from '@/lib/hooks/useConversation';
import { Paperclip, Send, ShieldCheck, Database } from 'lucide-react';

export interface ChatInputProps {
  isStreaming: boolean;
  /** History for this conversation, aligned with backend `sessionContext.recentExchanges` */
  sessionContext: SessionContext;
  onSubmit: (payload: QueryPayload) => void;
}

export function ChatInput({
  isStreaming,
  sessionContext,
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
      sessionContext,
    };

    onSubmit(payload);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-surface via-surface/90 to-transparent">
      <form
        onSubmit={handleSubmit}
        className="max-w-4xl mx-auto flex flex-col gap-3"
      >
        <div className="relative flex items-center bg-[#1C212E] border border-[#2A303C] rounded-xl shadow-lg ring-1 ring-black/5 focus-within:ring-brand-indigo/50 focus-within:border-brand-indigo/50 transition-all">
          <button type="button" className="pl-4 pr-2 text-slate-500 hover:text-slate-300 transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          
          <input
            type="text"
            placeholder="Ask a question about your data..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            className="flex-1 bg-transparent border-none py-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-0 disabled:opacity-50"
          />
          
          <div className="pr-2 pl-2 flex items-center">
            <button
              type="submit"
              disabled={isStreaming || !input.trim() || !activeConversation}
              className="p-2.5 rounded-lg bg-brand-indigo text-white font-medium hover:bg-brand-indigo-light disabled:bg-[#2A303C] disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              {isStreaming ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Footer Meta Text */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <div className="flex items-center gap-4 border-slate-700/50">
             <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> Context: Active dataset loaded</span>
             <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Grounded reasoning enabled</span>
          </div>
          <div>
            Press ↵ to send
          </div>
        </div>
      </form>
    </div>
  );
}
