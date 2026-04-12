import React from 'react';
import type { Conversation } from '@/types';
import { useConversation } from '@/lib/hooks/useConversation';
import clsx from 'clsx';
import { MessageSquare } from 'lucide-react';

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
        'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1 truncate relative',
        isActive
          ? 'bg-[#1C212E] text-white font-bold'
          : 'text-slate-400 hover:bg-[#1C212E]/50 hover:text-slate-200'
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-brand-indigo rounded-r-md"></div>
      )}
      <span className="flex items-center gap-2 relative z-10 pl-2">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0"></span>
        <span className="truncate">{conversation.title || 'New Conversation'}</span>
      </span>
    </button>
  );
}
