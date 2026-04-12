import React from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

export function ConfidenceIndicator({ score }: { score: number }) {
  if (score === undefined || score === null) return null;

  let colorClass = 'bg-brand-cyan';
  let textColor = 'text-brand-cyan';
  if (score <= 40) {
    colorClass = 'bg-red-500';
    textColor = 'text-red-500';
  } else if (score <= 70) {
    colorClass = 'bg-brand-amber';
    textColor = 'text-brand-amber';
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-end gap-1 w-20 shrink-0">
        <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">CONFIDENCE</span>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-mono font-bold ${textColor}`}>{score}%</span>
          <div className="w-12 h-1 bg-surface-border rounded-full overflow-hidden shrink-0">
            <div 
              className={`h-full ${colorClass} transition-all duration-1000 ease-out`} 
              style={{ width: `${score}%` }} 
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 text-slate-500">
        <button className="p-1 hover:text-slate-300 hover:bg-surface-border rounded transition-colors">
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button className="p-1 hover:text-slate-300 hover:bg-surface-border rounded transition-colors">
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
