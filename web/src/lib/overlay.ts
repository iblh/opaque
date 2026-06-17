// A transient overlay/menu (dropdown, dialog, cheat-sheet) marks itself with
// `data-overlay` while open. Window-level shortcuts (notably the global Escape
// that exits edit mode) consult this so an Escape meant to close an open menu
// doesn't also discard an in-progress edit. This is robust to event ordering —
// it queries the DOM at handler time rather than relying on stopPropagation.
export const OVERLAY_ATTR = 'data-overlay';

export function isOverlayOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return document.querySelector(`[${OVERLAY_ATTR}]`) !== null;
}
