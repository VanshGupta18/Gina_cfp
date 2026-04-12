'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Dataset } from '@/types';
import { listDatasets } from '@/lib/api/datasets';
import { useAuth } from '@/lib/hooks/useAuth';

interface DatasetContextType {
  datasets: Dataset[];
  activeDataset: Dataset | null;
  setActiveDataset: (dataset: Dataset | string | null) => void;
  refreshDatasets: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDataset, setActiveDatasetState] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const refreshDatasets = useCallback(async () => {
    if (!session) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const fetchedDatasets = await listDatasets();
      setDatasets(fetchedDatasets);
      
      // Keep active dataset in sync or set first as active if none exists
      if (fetchedDatasets.length > 0) {
        setActiveDatasetState((current) => {
          if (!current || !fetchedDatasets.find(d => d.id === current.id)) {
            return fetchedDatasets[0];
          }
          return fetchedDatasets.find(d => d.id === current.id) || current;
        });
      } else {
        setActiveDatasetState(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load datasets';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Initial fetch when session becomes available
  useEffect(() => {
    refreshDatasets();
  }, [refreshDatasets]);

  const setActiveDataset = useCallback(
    (datasetOrId: Dataset | string | null) => {
      if (datasetOrId === null) {
        setActiveDatasetState(null);
      } else if (typeof datasetOrId === 'string') {
        const found = datasets.find((d) => d.id === datasetOrId);
        if (found) setActiveDatasetState(found);
      } else {
        setActiveDatasetState(datasetOrId);
      }
    },
    [datasets]
  );

  return (
    <DatasetContext.Provider
      value={{
        datasets,
        activeDataset,
        setActiveDataset,
        refreshDatasets,
        isLoading,
        error,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDatasets(): DatasetContextType {
  const context = useContext(DatasetContext);
  if (context === undefined) {
    throw new Error('useDatasets must be used within a DatasetProvider');
  }
  return context;
}
