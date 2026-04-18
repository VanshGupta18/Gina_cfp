'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebarViewModel } from '@/lib/hooks/useSidebarViewModel';
import { useToast } from '@/lib/providers/ToastProvider';
import { SidebarHeaderActions } from './SidebarHeaderActions';
import { DatasetTree } from './DatasetTree';
import { SidebarEmptyState } from './SidebarEmptyState';
import { SidebarErrorState } from './SidebarErrorState';
import type { Conversation, Dataset } from '@/types';

interface NonTechSidebarProps {
  onNavigate?: () => void;
  onViewDataset?: () => void;
  onSemanticCorrections?: () => void;
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
export default function NonTechSidebar({
  onNavigate,
  onViewDataset,
  onSemanticCorrections,
}: NonTechSidebarProps) {
  const router = useRouter();
  const vm = useSidebarViewModel();
  const { showToast } = useToast();
  const [sidebarMutating, setSidebarMutating] = useState(false);

  const handleSelectDataset = useCallback(
    (dataset: Dataset) => {
      vm.setActiveDataset(dataset);
    },
    [vm],
  );

  const handleSelectChat = useCallback(
    (conversation: Conversation, datasetId: string) => {
      void datasetId;
      vm.setActiveConversation(conversation);
      router.push(`/app/${conversation.id}`);
      onNavigate?.();
    },
    [vm, router, onNavigate],
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
    (datasetId: string) => {
      vm.retryLoadDatasetConversations(datasetId);
    },
    [vm],
  );

  const handleRenameDataset = useCallback(
    (dataset: Dataset) => {
      if (dataset.isDemo) return;
      const next = window.prompt('Dataset name', dataset.name);
      if (next === null) return;
      const trimmed = next.trim();
      if (!trimmed) {
        showToast('Name cannot be empty', 'error');
        return;
      }
      void (async () => {
        setSidebarMutating(true);
        try {
          await vm.renameDataset(dataset, trimmed);
          showToast('Dataset renamed', 'success');
        } catch {
          showToast('Failed to rename dataset', 'error');
        } finally {
          setSidebarMutating(false);
        }
      })();
    },
    [vm, showToast],
  );

  const handleDeleteDataset = useCallback(
    (dataset: Dataset) => {
      if (dataset.isDemo) return;
      if (
        !window.confirm(
          `Delete dataset "${dataset.name}"?\n\nAll conversations for this dataset will be permanently removed.`,
        )
      ) {
        return;
      }
      void (async () => {
        setSidebarMutating(true);
        try {
          await vm.deleteDataset(dataset);
          showToast('Dataset deleted', 'success');
          router.push('/app');
        } catch {
          showToast('Failed to delete dataset', 'error');
        } finally {
          setSidebarMutating(false);
        }
      })();
    },
    [vm, showToast, router],
  );

  const handleRenameChat = useCallback(
    (conversation: Conversation) => {
      const next = window.prompt('Conversation title', conversation.title || 'Untitled');
      if (next === null) return;
      const trimmed = next.trim();
      if (!trimmed) {
        showToast('Title cannot be empty', 'error');
        return;
      }
      void (async () => {
        setSidebarMutating(true);
        try {
          await vm.renameChat(conversation, trimmed);
          showToast('Conversation renamed', 'success');
        } catch {
          showToast('Failed to rename conversation', 'error');
        } finally {
          setSidebarMutating(false);
        }
      })();
    },
    [vm, showToast],
  );

  const handleDeleteChat = useCallback(
    (conversation: Conversation) => {
      if (
        !window.confirm(
          `Delete this conversation?\n\n"${conversation.title || 'Untitled'}" will be permanently removed.`,
        )
      ) {
        return;
      }
      void (async () => {
        setSidebarMutating(true);
        try {
          await vm.deleteChat(conversation);
          showToast('Conversation deleted', 'success');
        } catch {
          showToast('Failed to delete conversation', 'error');
        } finally {
          setSidebarMutating(false);
        }
      })();
    },
    [vm, showToast],
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
        onViewDataset={onViewDataset}
        onSemanticCorrections={onSemanticCorrections}
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
              onRenameDataset={handleRenameDataset}
              onDeleteDataset={handleDeleteDataset}
              onRenameChat={handleRenameChat}
              onDeleteChat={handleDeleteChat}
              datasetActionsBusy={sidebarMutating}
              chatActionsBusy={sidebarMutating}
            />
          </div>
        )}
      </div>
    </div>
  );
}
