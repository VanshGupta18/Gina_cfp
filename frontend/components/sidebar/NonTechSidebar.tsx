'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebarViewModel } from '@/lib/hooks/useSidebarViewModel';
import { SidebarHeaderActions } from './SidebarHeaderActions';
import { DatasetTree } from './DatasetTree';
import { SidebarEmptyState } from './SidebarEmptyState';
import { SidebarErrorState } from './SidebarErrorState';

interface NonTechSidebarProps {
  onNavigate?: () => void;
}

/**
 * Non-Technical Unified Sidebar
 * 
 * Replaces the conversation-only rail with a nested dataset/chat tree
 * optimized for non-technical users. Features:
 * - Datasets as parent rows, chats as child rows
 * - Lazy-loaded conversations per dataset
 * - Per-dataset error handling and retry
 * - Persistent expand/collapse state
 * - Mobile auto-close on selection
 */
export default function NonTechSidebar({ onNavigate }: NonTechSidebarProps) {
  const router = useRouter();
  const vm = useSidebarViewModel();

  const handleSelectDataset = useCallback(
    (dataset) => {
      vm.setActiveDataset(dataset);
    },
    [vm]
  );

  const handleSelectChat = useCallback(
    (conversation) => {
      vm.setActiveConversation(conversation);
      router.push(`/app/${conversation.id}`);
      onNavigate?.();
    },
    [vm, router, onNavigate]
  );

  const handleNewChat = useCallback(async () => {
    if (!vm.activeDataset) return;
    const newConv = await vm.createNewChat();
    if (newConv) {
      vm.setActiveConversation(newConv);
      router.push(`/app/${newConv.id}`);
      onNavigate?.();
    }
  }, [vm, router, onNavigate]);

  const handleUpload = useCallback(() => {
    vm.openUploadModal();
  }, [vm]);

  const handleRetryDataset = useCallback(
    (datasetId) => {
      vm.retryLoadDatasetConversations(datasetId);
    },
    [vm]
  );

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background: 'rgba(12, 15, 22, 0.75)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header with Actions */}
      <SidebarHeaderActions
        onNewChat={handleNewChat}
        onUpload={handleUpload}
        activeDataset={vm.activeDataset}
        isCreatingChat={vm.isCreatingChat}
      />

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* No Datasets: Empty State */}
        {vm.datasetsLoading === false && vm.datasets.length === 0 && (
          <SidebarEmptyState onUpload={handleUpload} />
        )}

        {/* Datasets Load Error */}
        {vm.datasetsLoading === false && vm.datasetsError && vm.datasets.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <SidebarErrorState
              error={vm.datasetsError}
              onRetry={vm.refreshDatasets}
            />
          </div>
        )}

        {/* Datasets Exist: Show Tree */}
        {vm.datasets.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto py-2">
            <DatasetTree
              datasets={vm.datasets}
              activeDataset={vm.activeDataset}
              expandedDatasetIds={vm.expandedDatasetIds}
              onToggleExpand={vm.toggleExpandDataset}
              onSelectDataset={handleSelectDataset}
              conversationsByDataset={vm.conversationsByDataset}
              loadingDatasetIds={vm.loadingDatasetIds}
              errorsByDataset={vm.errorsByDataset}
              onRetryDataset={handleRetryDataset}
              onSelectChat={handleSelectChat}
              activeConversation={vm.activeConversation}
              isCreatingChat={vm.isCreatingChat}
            />
          </div>
        )}
      </div>
    </div>
  );
}
