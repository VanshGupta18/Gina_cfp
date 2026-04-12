'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/lib/providers/ToastProvider';

interface SQLExpandProps {
  sql: string;
  secondarySql?: string | null;
  rowsReturned?: number;
}

export function SQLExpand({ sql, secondarySql, rowsReturned }: SQLExpandProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedSql, setCopiedSql] = useState<'primary' | 'secondary' | null>(null);
  const { showToast } = useToast();

  const handleCopy = async (text: string, type: 'primary' | 'secondary') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSql(type);
      showToast(`${type === 'primary' ? 'Primary' : 'Secondary'} SQL copied to clipboard`, 'success', 2000);
      setTimeout(() => setCopiedSql(null), 2000);
    } catch {
      showToast('Failed to copy SQL', 'error');
    }
  };

  return (
    <div className="mb-4 border border-surface-border rounded-lg bg-surface flex flex-col overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2 hover:bg-surface-secondary transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className={`w-4 h-4 text-brand-teal transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-xs font-medium text-slate-300">See how this was calculated</span>
        </div>
        
        {/* Performance metrics shown on the tight header */}
        {rowsReturned !== undefined && (
          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium font-mono">
            <span>{rowsReturned} rows</span>
          </div>
        )}
      </button>

      {expanded && (
        <div className="p-4 border-t border-surface-border bg-surface-secondary">
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500">PRIMARY SQL</span>
              <button
                onClick={() => handleCopy(sql, 'primary')}
                className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded hover:bg-surface"
                aria-label="Copy primary SQL"
              >
                {copiedSql === 'primary' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <pre className="text-xs text-slate-300 overflow-x-auto p-3 rounded-md bg-[#0F1623] border border-surface-border whitespace-pre-wrap">
              {sql}
            </pre>
          </div>
          {secondarySql && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-500">SECONDARY SQL (VERIFICATION)</span>
                <button
                  onClick={() => handleCopy(secondarySql, 'secondary')}
                  className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded hover:bg-surface"
                  aria-label="Copy secondary SQL"
                >
                  {copiedSql === 'secondary' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <pre className="text-xs text-slate-300 overflow-x-auto p-3 rounded-md bg-[#0F1623] border border-surface-border whitespace-pre-wrap opacity-80">
                {secondarySql}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
