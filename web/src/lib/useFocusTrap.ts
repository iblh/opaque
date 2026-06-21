import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter((el) => el.offsetParent !== null || el === document.activeElement);
}

// Accessible modal focus management. While `active`, focuses the first focusable
// control (or the container) inside `ref`, keeps Tab/Shift+Tab cycling within
// it, and restores focus to whatever was focused before — typically the trigger
// — on deactivation. Escape is intentionally left to the dialog's own handler.
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first control, or the container itself as a fallback.
    const initial = focusable(container)[0] ?? container;
    if (initial === container && !container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '-1');
    }
    initial.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusable(container);
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;

      // Wrap around the ends, and pull stray focus (outside the dialog) back in.
      if (event.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      // Restore focus to the trigger if it is still in the document.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active]);

  return ref;
}
