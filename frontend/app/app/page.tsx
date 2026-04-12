'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDatasets } from '@/lib/hooks/useDatasets';
import { useConversation } from '@/lib/hooks/useConversation';
import { useUploadModal } from '@/lib/hooks/useUploadModal';

export default function AppPage() {
  const router = useRouter();
  const { datasets, isLoading: datasetsLoading, error: datasetsError, refreshDatasets } = useDatasets();
  const { conversations, isLoading: convsLoading } = useConversation();
  const { openUploadModal } = useUploadModal();

  const isAnythingLoading = datasetsLoading || convsLoading;

  if (isAnythingLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface text-slate-400">
         <div className="flex flex-col items-center gap-4">
             <div className="w-8 h-8 relative">
                 <div className="absolute inset-0 rounded-full border-2 border-brand-teal/20"></div>
                 <div className="absolute inset-0 rounded-full border-2 border-brand-teal border-t-transparent animate-spin"></div>
             </div>
             <p className="text-sm font-medium">Loading workspace...</p>
         </div>
      </div>
    );
  }

  if (datasetsError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface text-center max-w-lg mx-auto">
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300 mb-4 text-left w-full">
          {datasetsError}
        </div>
        <button
          type="button"
          onClick={() => void refreshDatasets()}
          className="px-5 py-2.5 bg-brand-teal text-white rounded-xl text-sm font-medium hover:bg-brand-teal-light transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  // If there are datasets but no conversations, show prompt to create one
  if (datasets.length > 0 && conversations.length === 0) {
     return (
       <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface text-center">
         <div className="w-16 h-16 rounded-2xl bg-brand-indigo/10 flex items-center justify-center mb-6">
           <svg className="w-8 h-8 text-brand-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
           </svg>
         </div>
         <h3 className="text-xl font-semibold font-serif text-slate-200 mb-2">No conversations yet</h3>
         <p className="text-slate-400 max-w-md mx-auto text-sm">
            Click &quot;New conversation&quot; in the sidebar to start asking questions about your data.
         </p>
       </div>
     );
  }

  if (datasets.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface text-center">
         <div className="w-16 h-16 rounded-2xl border border-dashed border-surface-border bg-[#1C212E] flex items-center justify-center mb-6">
           <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
           </svg>
         </div>
         <h3 className="text-xl font-semibold font-serif text-slate-200 mb-2">No datasets found</h3>
         <p className="text-slate-400 max-w-md mx-auto text-sm mb-6">
            Upload your first CSV dataset or explore the demo datasets in the sidebar to get started.
         </p>
         <button 
            onClick={openUploadModal}
            className="px-6 py-2.5 bg-brand-indigo text-white rounded-xl shadow-lg shadow-brand-indigo/20 text-sm font-medium hover:bg-brand-indigo-light transition-all"
         >
            Upload dataset
         </button>
      </div>
    );
  }

  // Active dataset and conversation exists — this should be handled by the Chat component later.
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface text-center">
       <div className="w-16 h-16 rounded-2xl bg-brand-indigo/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(90,78,227,0.15)]">
           <svg className="w-8 h-8 text-brand-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3" />
           </svg>
       </div>
       <h3 className="text-2xl font-bold font-serif text-white tracking-wide mb-3">Welcome to G.I.N.A</h3>
       <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
          Select a dataset and conversation from the sidebar to view your messages and begin exploring your data.
       </p>
    </div>
  );
}
