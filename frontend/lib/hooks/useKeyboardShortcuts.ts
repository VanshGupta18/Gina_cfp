'use client';

import { useEffect } from 'react';

interface KeyboardShortcuts {
  'Ctrl+K'?: () => void;
  'Cmd+K'?: () => void;
  'Ctrl+Enter'?: () => void;
  'Cmd+Enter'?: () => void;
  'Escape'?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      // Check for Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const key = isMac ? 'Cmd+K' : 'Ctrl+K';
        shortcuts[key as keyof KeyboardShortcuts]?.();
      }
      
      // Check for Ctrl+Enter or Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const key = isMac ? 'Cmd+Enter' : 'Ctrl+Enter';
        shortcuts[key as keyof KeyboardShortcuts]?.();
      }
      
      // Check for Escape
      if (e.key === 'Escape') {
        shortcuts['Escape']?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
