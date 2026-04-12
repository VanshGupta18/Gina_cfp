import React from 'react';

interface PIISummaryBannerProps {
  redactedColumns: string[];
}

export default function PIISummaryBanner({ redactedColumns }: PIISummaryBannerProps) {
  if (redactedColumns.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg bg-brand-amber/10 border border-brand-amber/20 p-4">
      <div className="flex items-start gap-3 text-brand-amber">
        <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h4 className="text-sm font-semibold mb-1">
            We detected and redacted {redactedColumns.length} sensitive column{redactedColumns.length > 1 ? 's' : ''} before processing.
          </h4>
          <p className="text-xs opacity-90 leading-relaxed">
            Your original file is unchanged. The following columns were anonymised to protect privacy: 
            <span className="font-medium ml-1">{redactedColumns.join(', ')}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
