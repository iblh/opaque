'use client';

import { useEffect } from 'react';
import { IconX } from '@tabler/icons-react';
import { ShortcutsList } from '@/components/shortcuts';
import { useFocusTrap } from '@/lib/useFocusTrap';

// A quiet, centered cheat-sheet (the '?' overlay). Follows Quiet
// Instrumentality: serif title, hairline divider, mono keycaps, no decoration.
export default function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const panelRef = useFocusTrap<HTMLDivElement>(true);

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
      data-overlay
      onClick={onClose}
      className="fixed inset-0 z-[80] flex animate-fade-in items-center justify-center bg-ink-900/20 p-4"
    >
      <div
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-sm rounded-sm border border-border-light bg-surface-elevated p-5 shadow-floating"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="opaque-tap absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-sunken hover:text-text-primary"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>

        <div className="font-serif text-sm text-text-primary">Keyboard shortcuts</div>
        <div className="mt-3">
          <ShortcutsList />
        </div>
      </div>
    </div>
  );
}
