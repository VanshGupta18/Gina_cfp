import React from 'react';

export function KeyFigure({ text }: { text: string }) {
  if (!text || text === '—') return null;
  return (
    <div className="mb-2">
      <span
        className="text-5xl font-bold tracking-tight text-white font-serif"
        style={{ textShadow: '0 0 40px rgba(60,224,214,0.15)' }}
      >
        {text}
      </span>
    </div>
  );
}
