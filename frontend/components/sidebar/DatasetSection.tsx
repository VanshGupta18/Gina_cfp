import React, { useState, useEffect } from 'react';
import type { Dataset } from '@/types';
import { useDatasets } from '@/lib/hooks/useDatasets';
import { useConversation } from '@/lib/hooks/useConversation';
import ConversationItem from './ConversationItem';
import NewConversationBtn from './NewConversationBtn';
import DemoBadge from './DemoBadge';
import { Database, ChevronRight, CheckCircle2 } from 'lucide-react';

interface DatasetSectionProps {
  dataset: Dataset;
}

export default function DatasetSection({ dataset }: DatasetSectionProps) {
  const { activeDataset, setActiveDataset } = useDatasets();
  // Ensure we consistently use hooks at the top level
  // Even if not active, we still call the hook, but it fetches based on context
  const { conversations, isLoading } = useConversation(); 
  const isActive = activeDataset?.id === dataset.id;
  
  const [isExpanded, setIsExpanded] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    }
  }, [isActive]);

  const handleToggle = () => {
    if (!isActive) {
      setActiveDataset(dataset);
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mb-1">
      <button
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors border ${
          isActive 
            ? 'bg-[#1C212E] border-[#252B3A] text-white shadow-sm' 
            : 'border-transparent text-slate-400 hover:bg-[#1C212E]/50 hover:text-slate-300'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {isActive ? (
             <CheckCircle2 className="w-4 h-4 text-brand-indigo shrink-0" />
          ) : (
             <Database className="w-4 h-4 shrink-0 opacity-70" />
          )}
          
          <span className="text-sm font-medium truncate tracking-wide">
            {dataset.name}
          </span>
          {dataset.isDemo && <DemoBadge />}
        </div>
        <ChevronRight 
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90 opacity-100' : 'opacity-0 -translate-x-2'}`} 
        />
      </button>

      {isExpanded && (
        <div className="mt-1 relative">
          {/* Connecting line */}
          <div className="absolute left-[22px] top-0 bottom-0 w-[1px] bg-[#1C212E] z-0"></div>

          <div className="pl-9 pr-2 py-1 flex flex-col gap-1 relative z-10">
            {isActive ? (
              isLoading ? (
                <div className="text-xs text-slate-500 py-2 pl-2">Loading...</div>
              ) : conversations.length > 0 ? (
                conversations.map(conv => (
                  <ConversationItem key={conv.id} conversation={conv} />
                ))
              ) : null
            ) : (
              <div className="text-xs text-slate-500 py-2 pl-2">Click to load conversations</div>
            )}
            
            {isActive && <NewConversationBtn />}
          </div>
        </div>
      )}
    </div>
  );
}
