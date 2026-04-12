import React, { useState } from 'react';
import type { Conversation } from '@/types';
import { useConversation } from '@/lib/hooks/useConversation';
import clsx from 'clsx';
import { MessageSquare, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/providers/ToastProvider';

interface ConversationItemProps {
  conversation: Conversation;
}

export default function ConversationItem({ conversation }: ConversationItemProps) {
  const { activeConversation, setActiveConversation } = useConversation();
  const router = useRouter();
  const { showToast } = useToast();
  const isActive = activeConversation?.id === conversation.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title || 'New Conversation');
  const [showMenu, setShowMenu] = useState(false);

  const handleNavigate = () => {
    setActiveConversation(conversation);
    router.push(`/app/${conversation.id}`);
  };

  const handleRename = async () => {
    if (!editTitle.trim()) {
      showToast('Title cannot be empty', 'error');
      return;
    }
    try {
      // TODO: Add API call to update conversation title
      // await updateConversationTitle(conversation.id, editTitle);
      showToast('Conversation renamed', 'success');
      setIsEditing(false);
    } catch {
      showToast('Failed to rename conversation', 'error');
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Delete conversation "${conversation.title || 'Untitled'}"?`)) {
      try {
        // TODO: Add API call to delete conversation
        // await deleteConversation(conversation.id);
        showToast('Conversation deleted', 'success');
      } catch {
        showToast('Failed to delete conversation', 'error');
      }
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        autoFocus
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        onBlur={handleRename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleRename();
          if (e.key === 'Escape') setIsEditing(false);
        }}
        className="w-full px-3 py-2 rounded-lg bg-[#1C212E] border border-brand-indigo text-white text-sm focus:outline-none"
      />
    );
  }

  return (
    <div className="relative group mb-1">
      <button
        onClick={handleNavigate}
        className={clsx(
          'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate relative',
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

      {/* Action Menu */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 text-slate-400 hover:text-slate-200 rounded"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-1 bg-[#1C212E] border border-surface-border rounded-lg shadow-lg z-50 min-w-max">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setShowMenu(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-surface-secondary transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
                setShowMenu(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
