import React from 'react';
import type { Conversation } from '@/types';
import { useConversation } from '@/lib/hooks/useConversation';
import clsx from 'clsx';

interface ConversationItemProps {
  conversation: Conversation;
}

export default function ConversationItem({ conversation }: ConversationItemProps) {
  const { activeConversation, setActiveConversation } = useConversation();
  const isActive = activeConversation?.id === conversation.id;

  return (
    <button
      onClick={() => setActiveConversation(conversation)}
      className={clsx(
        'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1 truncate',
        isActive
          ? 'bg-surface-tertiary text-slate-100 font-medium border border-surface-border'
          : 'text-slate-400 hover:bg-surface-tertiary/50 hover:text-slate-200'
      )}
    >
      <span className="flex items-center gap-2">
        <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        {conversation.title || 'New Conversation'}
      </span>
    </button>
  );
}
