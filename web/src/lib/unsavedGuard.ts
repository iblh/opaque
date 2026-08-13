// One source of truth for "the editor holds unsaved work".
//
// The dashboard draft lives in memory until it is saved, and there are two ways
// to lose it: leaving the document (tab close, reload, external link), and
// navigating inside the SPA (logging out, submitting a search). `beforeunload`
// only covers the first — a router.push never fires it — so in-app navigation
// has to ask this module instead.
//
// Kept deliberately outside React: the components that navigate (Header) are not
// the component that owns the draft (the dashboard page), and threading a dirty
// flag through every intermediate prop would leave the next navigation entry
// point free to forget it again.

let unsavedReason: string | null = null;

/**
 * Mark (or clear) the editor as holding unsaved work. Pass a short reason to
 * arm the guard; pass null when the draft is saved or discarded.
 */
export function setUnsavedWork(reason: string | null): void {
  unsavedReason = reason;
}

/** Whether the editor currently holds work that leaving would discard. */
export function hasUnsavedWork(): boolean {
  return unsavedReason !== null;
}

/**
 * Ask before an in-app navigation that would drop the draft. Returns true when
 * it is safe to proceed — either nothing is unsaved, or the user accepted the
 * loss. Callers must honour a false return by cancelling the navigation.
 */
export function confirmDiscardUnsaved(): boolean {
  if (!unsavedReason) return true;
  if (typeof window === 'undefined') return true;
  return window.confirm(unsavedReason);
}
