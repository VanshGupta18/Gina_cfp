'use client';

import { MessageSquareText } from 'lucide-react';

interface ConversationWelcomeProps {
  conversationId: string;
  datasetId: string;
}

const starterQuestions = [
  'Show total amount by month.',
  'Which category has the highest value?',
  'Give me a quick summary of this dataset.',
];

function submitQuestion(question: string) {
  window.dispatchEvent(new CustomEvent('ttd:submit-chat', { detail: question }));
}

export function ConversationWelcome({ conversationId, datasetId }: ConversationWelcomeProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-14" data-conversation-id={conversationId} data-dataset-id={datasetId}>
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(160deg, rgba(20,24,34,0.95) 0%, rgba(28,33,46,0.85) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/15 border border-brand-cyan/35">
            <MessageSquareText className="h-5 w-5 text-brand-cyan" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">New Conversation</p>
            <p className="text-lg font-semibold text-white">Start by asking anything about your data</p>
          </div>
        </div>

        <p className="text-slate-300 text-sm mb-4">
          Use one of these prompts or write your own question below.
        </p>

        <div className="flex flex-wrap gap-2">
          {starterQuestions.map((question) => (
            <button
              key={question}
              onClick={() => submitQuestion(question)}
              className="px-3 py-2 rounded-lg text-xs text-slate-300 border border-white/10 bg-white/5 hover:bg-brand-indigo/15 hover:border-brand-indigo/40 hover:text-white transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
