import { useEffect, useRef, type RefObject } from 'react';

interface FocusTrapOptions {
  // Element to restore focus to on close. Use this when the trigger that opened
  // the dialog is unmounted before close (e.g. a menu item that closed its menu)
  // — the captured document.activeElement would be gone, so an explicit ref is
  // needed. When omitted, focus returns to whatever was focused at open time.
  returnFocusRef?: RefObject<HTMLElement | null>;
}

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
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  options: FocusTrapOptions = {},
) {
  const ref = useRef<T>(null);
  const { returnFocusRef } = options;

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    // Snapshot the element to return focus to at open time: the explicit trigger
    // ref if given (it outlives an unmounted opener), else whatever was focused.
    const returnTarget = returnFocusRef?.current
      ?? (document.activeElement as HTMLElement | null);

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
      // Restore focus to the snapshotted trigger if it is still in the document.
      if (returnTarget && document.contains(returnTarget)) {
        returnTarget.focus();
      }
    };
  }, [active, returnFocusRef]);

  return ref;
}
