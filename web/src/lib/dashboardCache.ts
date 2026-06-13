import { Dashboard, Tree } from '@/lib/types';
import { isModuleRoot } from '@/lib/modules';

// A small, sanitized snapshot of the last loaded dashboard, cached client-side
// so a returning visit can paint a structurally-correct view immediately while
// the verified /api/dashboard/get response replaces it silently. The skeleton
// then only appears on a true first visit.
//
// Two safety rules drive the shape of this cache:
//   1. It must never hold secrets. Module `config` carries provider API
//      keys/tokens, so it is stripped before caching — the optimistic paint
//      shows module structure only; real config + data arrive with the fetch.
//   2. It must never cross sessions. The owning dashboard id is stored in the
//      payload; the caller discards the optimistic paint if the verified fetch
//      returns a different id (shared browser / new login / session expiry).

const STORAGE_KEY = 'opaque:dashboard-cache';

interface CachedDashboard {
  /** Identifies the owning dashboard; checked against the verified fetch. */
  id: string;
  dashboard: Dashboard;
}

function dashboardId(dashboard: Dashboard): string | null {
  return dashboard.id || dashboard._id || null;
}

// Remove module config (the only secret-bearing field) from every tree, so a
// stolen localStorage entry can't yield provider credentials.
function stripSecrets(dashboard: Dashboard): Dashboard {
  const forest: Tree[] = dashboard.forest.map((tree) => {
    if (!isModuleRoot(tree.root)) return tree;
    return {
      ...tree,
      branches: tree.branches.map((branch) => {
        if (!('config' in branch) || branch.config === undefined) return branch;
        const { config: _config, ...rest } = branch;
        return rest;
      }),
    };
  });
  return { ...dashboard, forest };
}

export function readCachedDashboard(): CachedDashboard | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed
      || typeof parsed !== 'object'
      || typeof (parsed as CachedDashboard).id !== 'string'
      || !(parsed as CachedDashboard).dashboard
    ) {
      return null;
    }
    return parsed as CachedDashboard;
  } catch {
    return null;
  }
}

export function saveCachedDashboard(dashboard: Dashboard) {
  const id = dashboardId(dashboard);
  // Without a stable id we can't guard against cross-session reuse, so skip
  // caching entirely rather than risk showing it to the wrong user.
  if (!id) {
    clearCachedDashboard();
    return;
  }
  try {
    const payload: CachedDashboard = { id, dashboard: stripSecrets(dashboard) };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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
