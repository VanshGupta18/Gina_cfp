import React from 'react';

export function ConfidenceIndicator({ score }: { score: number }) {
  if (score === undefined || score === null) return null;

  let barColor = 'rgba(60,224,214,0.9)';
  let textColor = '#3CE0D6';
  let bgColor = 'rgba(60,224,214,0.08)';
  let borderColor = 'rgba(60,224,214,0.20)';

  if (score <= 40) {
    barColor = 'rgba(239,68,68,0.9)';
    textColor = '#EF4444';
    bgColor = 'rgba(239,68,68,0.08)';
    borderColor = 'rgba(239,68,68,0.20)';
  } else if (score <= 70) {
    barColor = 'rgba(245,158,11,0.9)';
    textColor = '#F59E0B';
    bgColor = 'rgba(245,158,11,0.08)';
    borderColor = 'rgba(245,158,11,0.20)';
  }

  return (
    <div
      className="flex flex-col items-end gap-1.5 rounded-xl px-3 py-2 shrink-0"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      <span className="text-[9px] font-bold tracking-[0.15em] uppercase" style={{ color: 'rgba(100,116,139,0.8)' }}>
        Confidence
      </span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold font-mono" style={{ color: textColor }}>
          {score}%
        </span>
        <div
          className="w-14 h-1.5 rounded-full overflow-hidden shrink-0"
          style={{ background: 'rgba(42,48,60,0.6)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${score}%`,
              background: barColor,
              boxShadow: `0 0 6px ${barColor}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
