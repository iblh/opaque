import { Dashboard } from '@/lib/types';

// Last successfully loaded dashboard, cached client-side so a returning visit
// can paint real content immediately and let the network response replace it
// silently. The skeleton then only appears on a true first visit.

const STORAGE_KEY = 'opaque:dashboard-cache';

export function readCachedDashboard(): unknown | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCachedDashboard(dashboard: Dashboard) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboard));
  } catch {
    // Storage unavailable; next visit simply shows the skeleton again.
  }
}

export function clearCachedDashboard() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
