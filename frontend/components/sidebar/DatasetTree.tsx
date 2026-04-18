'use client';

import React from 'react';
import type { Dataset, Conversation } from '@/types';
import { DatasetNode } from './DatasetNode';

interface DatasetTreeProps {
  datasets: Dataset[];
  activeDataset: Dataset | null;
  expandedDatasetIds: Set<string>;
  onToggleExpand: (datasetId: string) => void;
  onSelectDataset: (dataset: Dataset) => void;
  conversationsByDataset: Map<string, Conversation[]>;
  loadingDatasetIds: Set<string>;
  errorsByDataset: Map<string, string>;
  onRetryDataset: (datasetId: string) => void;
  onSelectChat: (conversation: Conversation, datasetId: string) => void;
  activeConversation: Conversation | null;
  isCreatingChat: boolean;
  onRenameDataset?: (dataset: Dataset) => void;
  onDeleteDataset?: (dataset: Dataset) => void;
  onRenameChat?: (conversation: Conversation) => void;
  onDeleteChat?: (conversation: Conversation) => void;
  datasetActionsBusy?: boolean;
  chatActionsBusy?: boolean;
}

export function DatasetTree({
  datasets,
  activeDataset,
  expandedDatasetIds,
  onToggleExpand,
  onSelectDataset,
  conversationsByDataset,
  loadingDatasetIds,
  errorsByDataset,
  onRetryDataset,
  onSelectChat,
  activeConversation,
  isCreatingChat,
  onRenameDataset,
  onDeleteDataset,
  onRenameChat,
  onDeleteChat,
  datasetActionsBusy,
  chatActionsBusy,
}: DatasetTreeProps) {
  if (datasets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-0.5 px-1">
      {datasets.map((dataset) => (
        <DatasetNode
          key={dataset.id}
          dataset={dataset}
          isActive={activeDataset?.id === dataset.id}
          isExpanded={expandedDatasetIds.has(dataset.id)}
          onToggle={() => onToggleExpand(dataset.id)}
          onSelect={() => onSelectDataset(dataset)}
          chats={conversationsByDataset.get(dataset.id) || null}
          isLoading={loadingDatasetIds.has(dataset.id)}
          error={errorsByDataset.get(dataset.id) || null}
          onRetry={() => onRetryDataset(dataset.id)}
          onSelectChat={(conversation) => onSelectChat(conversation, dataset.id)}
          activeConversation={activeConversation}
          isCreatingChat={isCreatingChat}
          onRenameDataset={onRenameDataset}
          onDeleteDataset={onDeleteDataset}
          onRenameChat={onRenameChat}
          onDeleteChat={onDeleteChat}
          datasetActionsBusy={datasetActionsBusy}
          chatActionsBusy={chatActionsBusy}
        />
      ))}
    </div>
  );
}
