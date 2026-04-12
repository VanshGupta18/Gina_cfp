import React from 'react';

export function ConfidenceIndicator({ score }: { score: number }) {
  if (score === undefined || score === null) return null;

  let colorClass = 'bg-brand-teal';
  if (score <= 40) colorClass = 'bg-red-500';
  else if (score <= 70) colorClass = 'bg-brand-amber';

  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="text-xs font-medium text-slate-400 w-24">Confidence: {score}%</span>
      <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-1000 ease-out`} 
          style={{ width: `${score}%` }} 
        />
      </div>
    </div>
  );
}
