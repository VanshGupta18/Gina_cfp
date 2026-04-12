import React from 'react';

export function BigNumberCard({ label, value }: { label?: string; value?: string | number }) {
  if (value === undefined) return null;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-surface-secondary border border-surface-border rounded-xl min-h-[300px]">
      <span className="text-6xl font-bold text-brand-teal-light mb-4 text-center">
        {value}
      </span>
      {label && (
        <span className="text-sm font-medium text-slate-400 uppercase tracking-widest text-center">
          {label}
        </span>
      )}
    </div>
  );
}
