'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Conversation, Message } from '@/types';
import { listConversations, createConversation } from '@/lib/api/conversations';
import { getMessages } from '@/lib/api/messages';
import { useDatasets } from './useDatasets';

interface ConversationContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation | string | null) => void;
  refreshConversations: () => Promise<void>;
  createNewConversation: (title?: string) => Promise<Conversation | null>;
  messages: Message[];
  addMessage: (msg: Message) => void;
  isLoading: boolean;
  error: string | null;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const { activeDataset } = useDatasets();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationState, setActiveConversationState] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshConversations = useCallback(async () => {
    if (!activeDataset) {
      setConversations([]);
      setActiveConversationState(null);
      setMessages([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const fetchedConversations = await listConversations(activeDataset.id);
      setConversations(fetchedConversations);
      
      // Keep active conversation in sync or set first as active if none exists
      if (fetchedConversations.length > 0) {
        setActiveConversationState((current) => {
          if (!current || !fetchedConversations.find(c => c.id === current.id)) {
            return fetchedConversations[0];
          }
          return fetchedConversations.find(c => c.id === current.id) || current;
        });
      } else {
        setActiveConversationState(null);
        setMessages([]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeDataset]);

  // Initial fetch when activeDataset changes
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const refreshMessages = useCallback(async () => {
    if (!activeConversationState) {
      setMessages([]);
      return;
    }

    try {
      const fetchedMessages = await getMessages(activeConversationState.id);
      setMessages(fetchedMessages);
    } catch (err: unknown) {
      console.error('Failed to load messages:', err);
    }
  }, [activeConversationState]);

  // Fetch messages when activeConversation changes
  useEffect(() => {
    refreshMessages();
  }, [refreshMessages]);

  const setActiveConversation = useCallback(
    (conversationOrId: Conversation | string | null) => {
      if (conversationOrId === null) {
        setActiveConversationState(null);
      } else if (typeof conversationOrId === 'string') {
        const found = conversations.find((c) => c.id === conversationOrId);
        if (found) setActiveConversationState(found);
      } else {
        setActiveConversationState(conversationOrId);
      }
    },
    [conversations]
  );
  
  const createNewConversation = useCallback(async (title?: string) => {
    if (!activeDataset) return null;
    setIsLoading(true);
    try {
        const newConv = await createConversation(activeDataset.id, title);
        setConversations(prev => [newConv, ...prev]);
        setActiveConversationState(newConv);
        return newConv;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create conversation';
        setError(message);
        return null;
    } finally {
        setIsLoading(false);
    }
  }, [activeDataset]);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        activeConversation: activeConversationState,
        setActiveConversation,
        refreshConversations,
        createNewConversation,
        messages,
        addMessage,
        isLoading,
        error,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation(): ConversationContextType {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}
