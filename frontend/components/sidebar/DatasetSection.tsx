import React, { useState, useEffect } from 'react';
import type { Dataset } from '@/types';
import { useDatasets } from '@/lib/hooks/useDatasets';
import { useConversation } from '@/lib/hooks/useConversation';
import ConversationItem from './ConversationItem';
import NewConversationBtn from './NewConversationBtn';
import DemoBadge from './DemoBadge';

interface DatasetSectionProps {
  dataset: Dataset;
}

export default function DatasetSection({ dataset }: DatasetSectionProps) {
  const { activeDataset, setActiveDataset } = useDatasets();
  const { conversations, isLoading } = useConversation();
  const isActive = activeDataset?.id === dataset.id;
  
  // Local toggle state for non-active dataset
  const [isExpanded, setIsExpanded] = useState(isActive);

  // Auto-expand if it becomes active
  useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    }
  }, [isActive]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (!isActive) {
      setActiveDataset(dataset);
    }
  };

  return (
    <div className="mb-2">
      <button
        onClick={handleToggle}
        className="flex items-center justify-between w-full text-left px-2 py-2 rounded-lg hover:bg-surface-tertiary transition-colors"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <svg 
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-slate-200 truncate">
            {dataset.name}
          </span>
          {dataset.isDemo && <DemoBadge />}
        </div>
      </button>

      {isExpanded && (
        <div className="pl-6 pr-2 mt-1 py-1 border-l border-surface-border ml-4">
          {isActive ? (
             isLoading ? (
               <div className="text-xs text-slate-500 py-2">Loading...</div>
             ) : conversations.length > 0 ? (
               conversations.map(conv => (
                 <ConversationItem key={conv.id} conversation={conv} />
               ))
             ) : (
               <div className="text-xs text-slate-500 py-2">No conversations yet</div>
             )
          ) : (
             <div className="text-xs text-slate-500 py-2">Select to load</div>
          )}
          
          {isActive && <NewConversationBtn />}
        </div>
      )}
    </div>
  );
}
