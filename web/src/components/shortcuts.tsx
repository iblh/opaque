// Single source of truth for the keyboard cheat-sheet, shared by the '?'
// overlay and the Settings → Shortcuts tab so they never drift.

export interface ShortcutRow {
  keys: string[];
  label: string;
}

export const SHORTCUTS: ShortcutRow[] = [
  { keys: ['/'], label: 'Focus search' },
  { keys: ['E'], label: 'Edit dashboard' },
  { keys: ['⌘', 'S'], label: 'Save changes' },
  { keys: ['Esc'], label: 'Exit edit · close overlay' },
  { keys: ['?'], label: 'Show this list' },
];

// The hairline-divided rows of label + mono keycaps. Reused verbatim in the
// overlay and the settings tab.
export function ShortcutsList() {
  return (
    <div className="divide-y divide-border-light border-t border-border-light">
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
  );
}
