import React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useDatasets } from '@/lib/hooks/useDatasets';
import { useUploadModal } from '@/lib/hooks/useUploadModal';
import DatasetSection from './DatasetSection';
import IntegrationDebugPanel from '@/components/debug/IntegrationDebugPanel';
import { LogOut, Upload, Settings } from 'lucide-react';
import Link from 'next/link';

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const { datasets, isLoading, error, refreshDatasets } = useDatasets();
  const { openUploadModal } = useUploadModal();

  const demoDatasets = datasets.filter((d) => d.isDemo);
  const userDatasets = datasets.filter((d) => !d.isDemo);

  return (
    <div className="flex flex-col h-full bg-[#10141D] text-slate-300 w-sidebar border-r border-[#1C212E]">
      {/* Header Profile Section */}
      <div className="flex items-center justify-between p-5 border-b border-[#1C212E]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-brand-indigo flex items-center justify-center text-sm font-bold text-white shrink-0">
            {user?.email?.substring(0, 2).toUpperCase() || 'JD'}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-sm font-semibold text-slate-100 truncate">
              {user?.email || 'james@natwest.com'}
            </span>
            <span className="text-[10px] font-medium tracking-widest text-slate-500 uppercase">
              PREMIUM ANALYST
            </span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Upload Button */}
      <div className="p-4 bg-[#10141D] sticky top-0 z-10 border-b border-[#1C212E]/50">
        <button
          onClick={openUploadModal}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1C212E] hover:bg-[#252B3A] text-slate-300 rounded-lg border border-dashed border-slate-600 transition-colors font-medium text-sm"
        >
          <Upload className="w-4 h-4" />
          Upload new dataset
        </button>
      </div>

      {/* Navigation & Datasets */}
      <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {/* Nav Links */}
        <div className="mb-6 space-y-1">
          <div className="text-xs font-bold tracking-widest text-slate-500 uppercase px-2 mb-3">
            DATASETS
          </div>
        </div>

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
              className="w-full text-center text-sm text-brand-indigo hover:text-brand-indigo-light underline"
            >
              Retry loading datasets
            </button>
          </div>
        ) : (
           <div className="space-y-6">
              {/* DEMO Datasets */}
              {demoDatasets.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">DEMO</span>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">{demoDatasets.length} DATASETS</span>
                  </div>
                  <div className="space-y-1">
                    {demoDatasets.map((dataset) => (
                      <DatasetSection key={dataset.id} dataset={dataset} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* User Datasets */}
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">MY DATASETS</span>
                </div>
                <div className="space-y-1">
                  {userDatasets.length > 0 ? (
                    userDatasets.map((dataset) => (
                      <DatasetSection key={dataset.id} dataset={dataset} />
                    ))
                  ) : (
                    <div className="mx-2 mt-2 border border-dashed border-[#232833] bg-[#171B26] p-6 rounded-xl flex flex-col items-center text-center">
                      <div className="w-10 h-10 bg-[#1C212E] rounded-lg flex items-center justify-center mb-3">
                        <Upload className="w-5 h-5 text-slate-500" />
                      </div>
                      <p className="text-xs text-slate-400 font-medium italic mb-2">No datasets yet</p>
                      <button onClick={openUploadModal} className="text-xs text-brand-indigo hover:text-brand-indigo-light cursor-pointer">
                        Upload a CSV to get started ↑
                      </button>
                    </div>
                  )}
                </div>
              </div>
           </div>
        )}
      </div>

      {/* Footer Settings */}
      <div className="p-5 border-t border-[#1C212E] flex items-center justify-between">
        <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
      
      <div className="px-5 pb-5 flex items-center justify-between whitespace-nowrap">
        <span className="text-xs font-mono text-slate-600">VER: 2.4.0-STABLE</span>
        <div className="font-serif italic font-bold tracking-widest text-[#7267F2] text-opacity-50">
           G.I.N.A
        </div>
      </div>

      <IntegrationDebugPanel />
    </div>
  );
}
