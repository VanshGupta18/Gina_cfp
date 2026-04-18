'use client';

import { createContext, useContext, ReactNode } from 'react';

interface DatasetActionsContextType {
  onViewDataset?: () => void;
  onSemanticCorrections?: () => void;
}

const DatasetActionsContext = createContext<DatasetActionsContextType>({});

export function DatasetActionsProvider({
  children,
  onViewDataset,
  onSemanticCorrections,
}: {
  children: ReactNode;
  onViewDataset?: () => void;
  onSemanticCorrections?: () => void;
}) {
  return (
    <DatasetActionsContext.Provider value={{ onViewDataset, onSemanticCorrections }}>
      {children}
    </DatasetActionsContext.Provider>
  );
}

export function useDatasetActions() {
  return useContext(DatasetActionsContext);
}
