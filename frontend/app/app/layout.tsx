'use client';

import React from 'react';
import Sidebar from '@/components/sidebar/Sidebar';
import { DatasetProvider } from '@/lib/hooks/useDatasets';
import { ConversationProvider } from '@/lib/hooks/useConversation';
import { UploadModalProvider } from '@/lib/hooks/useUploadModal';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DatasetProvider>
      <ConversationProvider>
        <UploadModalProvider>
          <div className="flex h-screen w-full bg-surface overflow-hidden">
            {/* Sidebar Area */}
            <div className="w-sidebar hidden md:flex flex-col border-r border-surface-border bg-surface-secondary">
              <Sidebar />
            </div>
            
            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden bg-surface">
              {children}
            </main>
          </div>
        </UploadModalProvider>
      </ConversationProvider>
    </DatasetProvider>
  );
}

