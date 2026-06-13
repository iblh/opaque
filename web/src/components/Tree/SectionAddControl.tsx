'use client';

import { useEffect, useRef, useState } from 'react';
import { IconPlus } from '@tabler/icons-react';

export interface SectionAddOption {
  value: string;
  label: string;
}

interface SectionAddControlProps {
  /** Accessible label, e.g. "Add group". */
  label: string;
  /**
   * When provided, clicking opens a small popover of choices and `onSelect` is
   * called with the chosen value. When omitted, clicking calls `onAdd` directly.
   */
  options?: SectionAddOption[];
  onAdd?: () => void;
  onSelect?: (value: string) => void;
}

/**
 * The single edit-mode "+" affordance for a section, pinned into the section
 * header band by the parent (which positions it absolutely). Keeping the add
 * action here — out of the content flow — means the section body is identical
 * in view and edit modes (WYSIWYG): nothing is added until the user asks.
 */
export default function SectionAddControl({
  label,
  options,
  onAdd,
  onSelect,
}: SectionAddControlProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleClick = () => {
    if (options && options.length > 0) {
      setOpen((value) => !value);
      return;
    }
    onAdd?.();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleClick}
        className="flex h-6 w-6 items-center justify-center rounded-sm border border-border-light bg-white text-text-muted transition-colors hover:border-border-medium hover:text-text-primary"
        aria-label={label}
        aria-haspopup={options ? 'menu' : undefined}
        aria-expanded={options ? open : undefined}
        title={label}
      >
        <IconPlus className="h-3.5 w-3.5" />
      </button>

      {open && options && options.length > 0 && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[9rem] overflow-hidden rounded-sm border border-border-light bg-white py-1 shadow-[0_16px_42px_rgba(0,0,0,0.08)]"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitem"
              onClick={() => {
                onSelect?.(option.value);
                setOpen(false);
              }}
              className="flex w-full items-center px-3 py-1.5 text-left text-[11px] text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
