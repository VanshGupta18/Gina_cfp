import React, { useState } from 'react';
import { useConversation } from '@/lib/hooks/useConversation';

export default function NewConversationBtn() {
  const { createNewConversation } = useConversation();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    await createNewConversation();
    setIsCreating(false);
  };

  return (
    <button
      onClick={handleCreate}
      disabled={isCreating}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-teal hover:text-brand-teal-light hover:bg-brand-teal/10 rounded-lg transition-colors mt-2"
    >
      {isCreating ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )}
      <span>New conversation</span>
    </button>
  );
}
