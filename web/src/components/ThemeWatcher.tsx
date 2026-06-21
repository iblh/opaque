'use client';

import { useEffect } from 'react';
import { applyTheme, readThemePreference } from '@/lib/theme';

// Keeps the theme in sync with the OS for the 'system' preference for the whole
// session — independent of whether Settings is open. (The pre-paint script in
// <head> only runs once at load; this follows live prefers-color-scheme changes.)
export default function ThemeWatcher() {
  useEffect(() => {
    // Reconcile once on mount. The <head> init script can leave `.dark` wrong
    // when localStorage is blocked (throws → no class set) or holds an
    // unrecognized value (treated as light there, but as 'system' by
    // readThemePreference) — re-applying the resolved preference fixes both, and
    // matches a dark OS even if the OS setting never changes during the session.
    applyTheme(readThemePreference());

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (readThemePreference() === 'system') applyTheme('system');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return null;
}
