import React from 'react';

export function KeyFigure({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="mb-6">
      <span className="text-5xl font-bold tracking-tight text-white font-serif">
        {text}
      </span>
    </div>
  );
}
