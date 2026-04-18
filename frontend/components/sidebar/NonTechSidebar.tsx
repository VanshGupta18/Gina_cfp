'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebarViewModel } from '@/lib/hooks/useSidebarViewModel';
import { useToast } from '@/lib/providers/ToastProvider';
import { useDeleteConfirm } from '@/lib/context/DeleteConfirmContext';
import { SidebarHeaderActions } from './SidebarHeaderActions';
import { DatasetTree } from './DatasetTree';
import { SidebarEmptyState } from './SidebarEmptyState';
import { SidebarErrorState } from './SidebarErrorState';
import type { Conversation, Dataset } from '@/types';

interface NonTechSidebarProps {
  onNavigate?: () => void;
  onViewDataset?: () => void;
  onSemanticCorrections?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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
  isCollapsed = false,
  onToggleCollapse,
}: NonTechSidebarProps) {
  const router = useRouter();
  const vm = useSidebarViewModel();
  const { showToast } = useToast();
  const { showDeleteConfirm } = useDeleteConfirm();
  const [sidebarMutating, setSidebarMutating] = useState(false);
  const [expandedDatasetIdInCollapsed, setExpandedDatasetIdInCollapsed] = useState<string | null>(null);

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
    (dataset: Dataset, newName: string) => {
      if (dataset.isDemo) return;
      void (async () => {
        setSidebarMutating(true);
        try {
          await vm.renameDataset(dataset, newName);
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
      showDeleteConfirm(dataset, 'dataset', async () => {
        setSidebarMutating(true);
        try {
          await vm.deleteDataset(dataset);
          showToast('Dataset deleted', 'success');
        } catch {
          showToast('Failed to delete dataset', 'error');
        } finally {
          setSidebarMutating(false);
        }
      });
    },
    [vm, showToast, showDeleteConfirm],
  );

  const handleDeleteChat = useCallback(
    (conversation: Conversation) => {
      showDeleteConfirm(conversation, 'chat', async () => {
        setSidebarMutating(true);
        try {
          await vm.deleteChat(conversation);
          showToast('Conversation deleted', 'success');
        } catch (error) {
          showToast('Failed to delete conversation', 'error');
          throw error;
        } finally {
          setSidebarMutating(false);
        }
      });
    },
    [vm, showToast, showDeleteConfirm],
  );

  const handleRenameChat = useCallback(
    (conversation: Conversation, newName: string) => {
      void (async () => {
        setSidebarMutating(true);
        try {
          await vm.renameChat(conversation, newName);
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
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />

      {/* Main Content Area */}
      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${isCollapsed ? 'hidden' : ''}`}>
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

      {/* Collapsed View: Dataset Icons with Expandable Chats */}
      {isCollapsed && vm.datasets.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto py-2 px-2">
          {[...vm.datasets]
            .sort((a, b) => {
              if (vm.activeDataset?.id === a.id) return -1;
              if (vm.activeDataset?.id === b.id) return 1;
              return 0;
            })
            .map((dataset) => {
              const chats = vm.conversationsByDataset.get(dataset.id) || [];
              const isExpanded = expandedDatasetIdInCollapsed === dataset.id;

              return (
                <div key={dataset.id} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectDataset(dataset);
                      setExpandedDatasetIdInCollapsed(isExpanded ? null : dataset.id);
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200 ${ vm.activeDataset?.id === dataset.id
                        ? 'bg-brand-indigo/30 text-brand-indigo'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-300'
                    }`}
                    title={dataset.name}
                  >
                    <span className="text-sm font-medium">{dataset.name.charAt(0).toUpperCase()}</span>
                  </button>

                  {/* Expandable Chats Dropdown */}
                  {isExpanded && chats.length > 0 && (
                    <div
                      className="absolute left-12 top-0 z-50 mt-0 w-48 rounded-lg border border-white/10 bg-slate-900 shadow-lg overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200"
                      style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(12px)',
                      }}
                    >
                      <div className="max-h-48 overflow-y-auto">
                        {chats.map((chat) => (
                          <button
                            key={chat.id}
                            type="button"
                            onClick={() => {
                              handleSelectChat(chat, dataset.id);
                              setExpandedDatasetIdInCollapsed(null);
                            }}
                            className={`block w-full text-left px-3 py-2 text-xs transition-colors ${
                              vm.activeConversation?.id === chat.id
                                ? 'bg-brand-indigo/20 text-brand-indigo'
                                : 'text-slate-300 hover:bg-white/5'
                            }`}
                            title={chat.title || 'Untitled'}
                          >
                            <div className="truncate font-medium">{chat.title || 'Untitled'}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
