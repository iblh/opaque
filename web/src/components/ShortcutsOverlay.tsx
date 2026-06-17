'use client';

import { useEffect } from 'react';
import { IconX } from '@tabler/icons-react';

interface ShortcutRow {
  keys: string[];
  label: string;
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: ['/'], label: 'Focus search' },
  { keys: ['E'], label: 'Edit dashboard' },
  { keys: ['⌘', 'S'], label: 'Save changes' },
  { keys: ['Esc'], label: 'Exit edit · close overlay' },
  { keys: ['?'], label: 'Show this list' },
];

// A quiet, centered cheat-sheet (the '?' overlay). Follows Quiet
// Instrumentality: serif title, hairline divider, mono keycaps, no decoration.
export default function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
      className="fixed inset-0 z-[80] flex animate-fade-in items-center justify-center bg-ink-900/20 p-4"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-sm rounded-sm border border-border-light bg-white p-5 shadow-floating"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-sunken hover:text-text-primary"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>

        <div className="font-serif text-sm text-text-primary">Keyboard shortcuts</div>
        <div className="mt-3 divide-y divide-border-light border-t border-border-light">
          {SHORTCUTS.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 py-2">
              <span className="text-xs text-text-secondary">{row.label}</span>
              <span className="flex flex-shrink-0 items-center gap-1">
                {row.keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-sm border border-border-medium bg-surface-sunken px-1.5 font-mono text-[10px] text-text-secondary"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
