import { useCallback, useEffect, useState } from 'react';

// A boolean that persists to localStorage under a stable key. Used for small,
// non-sensitive UI preferences (e.g. a collapsed section) that should survive
// reloads. SSR-safe: starts from `fallback` and reconciles after mount.
export function usePersistedBoolean(
  key: string,
  fallback: boolean,
): [boolean, (next: boolean) => void] {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === 'true' || raw === 'false') setValue(raw === 'true');
    } catch {
      // Storage unavailable; keep the in-memory fallback.
    }
  }, [key]);

  const set = useCallback((next: boolean) => {
    setValue(next);
    try {
      window.localStorage.setItem(key, String(next));
    } catch {
      // Ignore; the value still applies for this session.
    }
  }, [key]);

  return [value, set];
}
