import { useEffect } from 'react';

export interface KeyboardShortcut {
  /** `event.key` to match, compared case-insensitively (e.g. 'e', '/', '?'). */
  key: string;
  /** Require the platform command key (⌘ on macOS, Ctrl elsewhere). */
  meta?: boolean;
  handler: (event: KeyboardEvent) => void;
  /** Fire even when focus is in an input/textarea/contenteditable. */
  allowInInput?: boolean;
}

// True when the user is typing into a field — most shortcuts must stay silent
// there so normal text entry (including '/', '?', 'e') isn't hijacked.
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT'
    || tag === 'TEXTAREA'
    || tag === 'SELECT'
    || target.isContentEditable
  );
}

function matchesMeta(event: KeyboardEvent, wantsMeta: boolean | undefined): boolean {
  const hasMeta = event.metaKey || event.ctrlKey;
  return wantsMeta ? hasMeta : !hasMeta;
}

// A small global keyboard layer. Shortcuts are matched on keydown; the first
// match wins and gets preventDefault. Re-binds whenever `shortcuts` changes, so
// callers should memoize handlers or accept the cheap re-subscribe.
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey) return; // Leave Alt combos to the browser/OS.
      const inField = isEditableTarget(event.target);

      for (const shortcut of shortcuts) {
        if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;
        if (!matchesMeta(event, shortcut.meta)) continue;
        if (inField && !shortcut.allowInInput) continue;

        event.preventDefault();
        shortcut.handler(event);
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts, enabled]);
}
