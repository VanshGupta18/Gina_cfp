'use client';

import { useState, useRef } from 'react';
import { QueryPayload, type SessionContext } from '@/types';
import { useConversation } from '@/lib/hooks/useConversation';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface ChatInputProps {
  isStreaming: boolean;
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
  const formRef = useRef<HTMLFormElement>(null);

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

  const scheduleSubmit = () => {
    if (formRef.current && !isStreaming && input.trim() && activeConversation) {
      formRef.current.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  };

  useKeyboardShortcuts({
    'Cmd+Enter': scheduleSubmit,
    'Ctrl+Enter': scheduleSubmit,
  });

  const hasInput = input.trim().length > 0;
  const canSubmit = hasInput && !isStreaming && !!activeConversation;

  return (
    <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-surface via-surface/95 to-transparent">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="max-w-4xl mx-auto flex flex-col gap-3"
      >
        <div
          className="relative flex items-center rounded-2xl shadow-lg transition-all duration-200"
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: 'rgba(22, 27, 38, 0.85)',
            border: isStreaming
              ? '1px solid rgba(90,78,227,0.3)'
              : hasInput
              ? '1px solid rgba(90,78,227,0.4)'
              : '1px solid rgba(255,255,255,0.08)',
            boxShadow: hasInput || isStreaming
              ? '0 0 0 3px rgba(90,78,227,0.08), 0 4px 24px rgba(0,0,0,0.3)'
              : '0 4px 24px rgba(0,0,0,0.2)',
          }}
        >
          <Input
            type="text"
            placeholder="Ask a question about your data…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            className="flex-1 h-auto bg-transparent border-none shadow-none py-4 pl-5 pr-2 text-sm text-slate-200 placeholder-slate-600 focus-visible:ring-0 focus:outline-none disabled:opacity-50 italic-placeholder"
            style={{ fontStyle: 'normal' }}
          />

          <div className="pr-2 pl-1 flex items-center">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2.5 font-semibold text-sm tracking-wide gap-2 shadow-none rounded-xl"
              style={
                isStreaming
                  ? {
                      background: 'rgba(90,78,227,0.15)',
                      color: 'rgba(114,103,242,0.8)',
                    }
                  : canSubmit
                  ? {
                      background: 'linear-gradient(135deg, #5A4EE3, #7267F2)',
                      color: 'white',
                      boxShadow: '0 2px 12px rgba(90,78,227,0.45)',
                    }
                  : {
                      background: 'rgba(42,48,60,0.5)',
                      color: 'rgba(100,116,139,0.6)',
                    }
              }
            >
              {isStreaming ? (
                <>
                  <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>ASKING</span>
                </>
              ) : (
                <>
                  <span>ASK</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
