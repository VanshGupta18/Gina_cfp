'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { ChatView } from '@/components/chat/ChatView';
import { useConversation } from '@/lib/hooks/useConversation';

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { setActiveConversation } = useConversation();

  // Set active conversation based on URL param
  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId);
    }
  }, [conversationId, setActiveConversation]);

  return <ChatView />;
}
