'use client';

import { useEffect } from 'react';
import { applyAppearance, readAppearance } from '@/lib/theme';

// Keeps appearance in sync with the OS for the 'system' preference for the whole
// session — independent of whether Settings is open. (The pre-paint script in
// <head> only runs once at load; this follows live prefers-color-scheme changes.)
export default function ThemeWatcher() {
  useEffect(() => {
    // Reconcile once on mount. The <head> init script can leave the attributes
    // wrong when localStorage is blocked (throws → nothing set) or holds an
    // unrecognized value — re-applying the resolved preference fixes both, and
    // matches a dark OS even if the OS setting never changes during the session.
    applyAppearance(readAppearance());

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const appearance = readAppearance();
      if (appearance.theme === 'system') applyAppearance(appearance);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return null;
}
