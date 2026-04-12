import React from 'react';

export function KeyFigure({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="mb-4">
      <span className="text-3xl font-bold Tracking-tight text-brand-teal-light">
        {text}
      </span>
    </div>
  );
}
