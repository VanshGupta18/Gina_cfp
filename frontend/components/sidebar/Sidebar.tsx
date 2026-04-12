import React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useDatasets } from '@/lib/hooks/useDatasets';
import { useUploadModal } from '@/lib/hooks/useUploadModal';
import DatasetSection from './DatasetSection';

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const { datasets, isLoading, error, refreshDatasets } = useDatasets();
  const { openUploadModal } = useUploadModal();

  const demoDatasets = datasets.filter((d) => d.isDemo);
  const userDatasets = datasets.filter((d) => !d.isDemo);

  return (
    <div className="flex flex-col h-full bg-surface-secondary text-slate-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-brand-teal flex items-center justify-center text-sm font-semibold text-white shrink-0">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium truncate">
            {user?.email || 'User'}
          </span>
        </div>
        <button
          onClick={signOut}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-surface-tertiary rounded-md transition-colors"
          aria-label="Sign out"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {/* Upload Button */}
      <div className="p-4 bg-surface-secondary sticky top-0 z-10">
        <button
          onClick={openUploadModal}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-teal text-white rounded-xl shadow-lg shadow-brand-teal/20 hover:bg-brand-teal-light hover:shadow-brand-teal/30 transition-all font-medium text-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload new dataset
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-slate-500">Loading datasets...</div>
        ) : error ? (
          <div className="px-2 py-4 space-y-3">
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
            <button
              type="button"
              onClick={() => void refreshDatasets()}
              className="w-full text-center text-sm text-brand-teal hover:text-brand-teal-light underline"
            >
              Retry loading datasets
            </button>
          </div>
        ) : (
           <>
              {/* Demo Section */}
              {demoDatasets.length > 0 && (
                <div className="mb-6">
                  <div className="px-2 mb-2 pb-1 border-b border-surface-border">
                    <span className="text-xs font-semibold text-slate-500 tracking-wider">DEMO</span>
                  </div>
                  {demoDatasets.map((dataset) => (
                    <DatasetSection key={dataset.id} dataset={dataset} />
                  ))}
                </div>
              )}
              
              {/* User Datasets Section */}
              <div>
                <div className="px-2 mb-2 pb-1 border-b border-surface-border">
                  <span className="text-xs font-semibold text-slate-500 tracking-wider">MY DATASETS</span>
                </div>
                {userDatasets.length > 0 ? (
                  userDatasets.map((dataset) => (
                    <DatasetSection key={dataset.id} dataset={dataset} />
                  ))
                ) : (
                  <div className="px-2 py-4 text-sm text-slate-500 italic">
                    No datasets yet
                  </div>
                )}
              </div>
           </>
        )}
      </div>
    </div>
  );
}
