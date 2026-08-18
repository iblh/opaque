import {
  Dashboard,
  DashboardIdentity,
  DashboardRoot,
  Tree,
  Branch,
  Leaf,
  LayoutPreset,
  TreeLayout,
} from '@/lib/types';
import {
  DEFAULT_APPLICATION_ICON,
  DEFAULT_BOOKMARK_ICON,
  DEFAULT_SERVER_ICON,
  sanitizeSvg,
} from '@/lib/svg';
import { DASHBOARD_ROOTS, isModuleRoot, SINGLE_MODULE_ROOTS } from '@/lib/modules';
import {
  CURRENT_DASHBOARD_SCHEMA_VERSION,
  normalizeDashboardVersion,
} from '@/lib/dashboardVersion';

export const DEFAULT_ROOTS: DashboardRoot[] = [...DASHBOARD_ROOTS];
export const LAYOUT_PRESETS: LayoutPreset[] = ['100', '50/50', '33/33/33', '20/60/20'];

export function createEmptyDashboard(identity: DashboardIdentity = {}): Dashboard {
  return {
    ...identity,
    schemaVersion: CURRENT_DASHBOARD_SCHEMA_VERSION,
    revision: 1,
    forest: DEFAULT_ROOTS.map((root) => ({ root, branches: [] })),
  };
}

export function normalizeDashboard(
  dashboard: Partial<Dashboard> | null | undefined,
  identity: DashboardIdentity = {},
): Dashboard {
  const source = dashboard || {};
  const schemaVersion = normalizeDashboardVersion(source.schemaVersion);
  const revision = Number.isInteger(source.revision) && Number(source.revision) > 0
    ? Number(source.revision)
    : 1;
  const fallbackBranches = Array.isArray((source as any).branches)
    ? [{ root: 'bookmarks', branches: (source as any).branches }]
    : [];
  const sourceForest = Array.isArray(source.forest) ? source.forest : fallbackBranches;
  // The legacy "today" root has been dissolved: weather/calendar/markets are
  // now standalone single-module roots. Hoist any modules from a persisted
  // "today" tree into those roots (so saved config survives) and drop "today".
  const forestWithoutToday = hoistLegacyTodayRoots(sourceForest);
  const byRoot = new Map<string, Tree>();

  forestWithoutToday.forEach((tree) => {
    if (!tree?.root) return;
    byRoot.set(tree.root, normalizeTree(tree));
  });

  // Forest order is meaningful: it carries the user's within-column arrangement
  // (see reorderWithinRegion). Rebuilding it in DEFAULT_ROOTS order would throw
  // that away on every load, so keep the stored sequence and only use
  // DEFAULT_ROOTS to append roots that are genuinely missing.
  const storedTrees = [...byRoot.values()];
  const missingTrees = DEFAULT_ROOTS
    .filter((root) => !byRoot.has(root))
    .map((root) => ({ root, branches: [] as Tree['branches'] }));

  return {
    ...source,
    ...identity,
    id: stringifyObjectId((source as any)._id) || source.id,
    schemaVersion,
    revision,
    forest: [...storedTrees, ...missingTrees],
  };
}

// Map a legacy "today" module branch onto its new standalone root by type.
const LEGACY_TODAY_ROOT_BY_TYPE: Record<string, DashboardRoot> = {
  weather: 'weather',
  calendar: 'calendar',
  markets: 'markets',
};

// Dissolve a persisted "today" tree: each of its modules moves into the
// matching standalone root (weather/calendar/markets), preserving config and
// appending after anything already there. Returns the forest with "today"
// removed. A forest without a "today" root passes through unchanged.
//
// Layout is preserved: if the old "today" cell had a layout, the newly-created
// roots take over its slot — same row, consecutive columns starting at its
// colIndex, splitting its width evenly — and siblings further right in that row
// shift over so nothing collides. Without this, the hoisted roots would land as
// new full-width rows at the end and the user's saved placement would be lost.
function hoistLegacyTodayRoots(forest: unknown[]): Tree[] {
  const trees = forest.filter((tree): tree is Tree => (
    Boolean(tree) && typeof tree === 'object' && typeof (tree as Tree).root === 'string'
  ));
  const today = trees.find((tree) => tree.root === 'today');
  if (!today) return trees;

  const extraBranches = new Map<DashboardRoot, Branch[]>();
  (Array.isArray(today.branches) ? today.branches : []).forEach((branch) => {
    const moduleType = (branch as { moduleType?: string }).moduleType;
    const targetRoot = moduleType ? LEGACY_TODAY_ROOT_BY_TYPE[moduleType] : undefined;
    if (!targetRoot) return; // Unknown legacy module → dropped.
    const list = extraBranches.get(targetRoot) || [];
    list.push(branch);
    extraBranches.set(targetRoot, list);
  });

  const withoutToday = trees.filter((tree) => tree.root !== 'today');

  // Merge hoisted branches into existing roots, tracking which we've handled.
  // An existing root keeps its own layout; only brand-new roots inherit the
  // legacy "today" slot below.
  const handled = new Set<DashboardRoot>();
  const merged = withoutToday.map((tree) => {
    const extras = extraBranches.get(tree.root as DashboardRoot);
    if (!extras) return tree;
    handled.add(tree.root as DashboardRoot);
    return { ...tree, branches: [...(tree.branches || []), ...extras] };
  });

  // Roots that didn't already exist in the forest get created. Order them by
  // SINGLE_MODULE_ROOTS for deterministic placement.
  const newRoots = SINGLE_MODULE_ROOTS
    .filter((root) => extraBranches.has(root) && !handled.has(root))
    .map((root) => ({ root, branches: extraBranches.get(root) as Branch[] } as Tree));

  if (newRoots.length === 0) return merged;

  const todayLayout = normalizeLayout((today as { layout?: unknown }).layout);
  if (!todayLayout) {
    // No saved placement to preserve; append as implicit rows (prior behavior).
    return [...merged, ...newRoots];
  }

  // Make room in the legacy row: shift cells right of "today" by (N-1) so the
  // expanded set of N roots fits where the single "today" cell used to be.
  const shift = newRoots.length - 1;
  const shifted = shift > 0
    ? merged.map((tree) => {
        const layout = (tree as { layout?: TreeLayout }).layout;
        if (
          layout
          && layout.rowId === todayLayout.rowId
          && layout.colIndex > todayLayout.colIndex
        ) {
          return { ...tree, layout: { ...layout, colIndex: layout.colIndex + shift } };
        }
        return tree;
      })
    : merged;

  // Split "today"'s width evenly across the new roots, placed at consecutive
  // columns from its original colIndex. Per-row widths are renormalized on read.
  const splitWidth = todayLayout.widthPct / newRoots.length;
  const placed = newRoots.map((tree, index) => ({
    ...tree,
    layout: {
      rowId: todayLayout.rowId,
      rowIndex: todayLayout.rowIndex,
      colIndex: todayLayout.colIndex + index,
      widthPct: splitWidth,
    },
  }));

  return [...shifted, ...placed];
}

export function serializeDashboard(dashboard: Dashboard): Dashboard {
  const { _id, ...rest } = dashboard as any;

  return {
    ...rest,
    id: dashboard.id || stringifyObjectId(_id),
    forest: dashboard.forest.map(normalizeTree),
  };
}

export function cloneDashboard(dashboard: Dashboard): Dashboard {
  return JSON.parse(JSON.stringify(dashboard));
}

function normalizeTree(tree: Tree): Tree {
  // The per-layout ordering the user saved in edit mode. This rebuilds the tree
  // field by field, so anything not carried here is dropped on save.
  const order = normalizeOrder((tree as any).order);
  return {
    root: tree.root,
    layout: normalizeLayout((tree as any).layout),
    ...(order ? { order } : {}),
    branches: Array.isArray(tree.branches)
      ? tree.branches.map((branch) => normalizeBranch(tree.root, branch)).filter(Boolean) as Branch[]
      : [],
  };
}

/** Keep only finite numeric positions, so bad persisted data can't skew sorting. */
function normalizeOrder(order: unknown): Tree['order'] | undefined {
  if (!order || typeof order !== 'object' || Array.isArray(order)) return undefined;
  const entries = Object.entries(order as Record<string, unknown>)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value)) as [string, number][];
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeBranch(root: string, branch: Branch): Branch {
  const base = {
    ...branch,
    id: branch.id || cryptoRandomId(),
    name: branch.name || 'Untitled',
  } as Branch;

  if (root === 'servers') {
    // Live metrics come from the dedicated metrics tables and must not be copied
    // back into the user-authored Dashboard document during a save.
    const { stats: _stats, ...serverBase } = base as any;
    return {
      ...serverBase,
      url: (base as any).url || '',
      icon: sanitizeSvg((base as any).icon, DEFAULT_SERVER_ICON),
    } as Branch;
  }

  if (root === 'applications') {
    return {
      ...base,
      leaves: normalizeLeaves((base as any).leaves, DEFAULT_APPLICATION_ICON),
    } as Branch;
  }

  if (isModuleRoot(root)) {
    const moduleType = typeof (base as any).moduleType === 'string'
      ? (base as any).moduleType
      : 'unknown';
    const config = isPlainObject((base as any).config) ? (base as any).config : {};
    return {
      ...base,
      moduleType,
      enabled: (base as any).enabled !== false,
      config: migrateModuleConfig(moduleType, config),
    } as Branch;
  }

  return {
    ...base,
    leaves: normalizeLeaves((base as any).leaves, DEFAULT_BOOKMARK_ICON),
  } as Branch;
}

function migrateModuleConfig(moduleType: string, config: Record<string, unknown>) {
  // Older calendar modules accepted remote feed fields. The current calendar is
  // intentionally a local month grid, so those unused values must not survive
  // as apparently supported configuration in a v1 document.
  if (moduleType === 'calendar') return {};
  return config;
}

const LEGACY_PRESET_WIDTHS: Record<LayoutPreset, number[]> = {
  '100': [100],
  '50/50': [50, 50],
  '33/33/33': [100 / 3, 100 / 3, 100 / 3],
  '20/60/20': [20, 60, 20],
};

function normalizeLayout(layout: unknown): TreeLayout | undefined {
  if (!isPlainObject(layout)) return undefined;
  if (typeof layout.rowId !== 'string' || !layout.rowId.trim()) return undefined;

  const rowIndex = Number.isFinite(Number(layout.rowIndex)) ? Number(layout.rowIndex) : 0;

  const explicitCol = Number.isFinite(Number(layout.colIndex)) ? Number(layout.colIndex) : null;
  const explicitWidth = Number.isFinite(Number(layout.widthPct)) ? Number(layout.widthPct) : null;

  if (explicitCol !== null && explicitWidth !== null) {
    return {
      rowId: layout.rowId,
      rowIndex: Math.max(0, rowIndex),
      colIndex: Math.max(0, explicitCol),
      widthPct: Math.max(0, Math.min(100, explicitWidth)),
    };
  }

  // Legacy migration: { preset, slotIndex } → { widthPct, colIndex }.
  const preset = typeof layout.preset === 'string' ? (layout.preset as LayoutPreset) : '100';
  if (!LAYOUT_PRESETS.includes(preset)) return undefined;

  const slotIndex = Number.isFinite(Number(layout.slotIndex)) ? Number(layout.slotIndex) : 0;
  const widths = LEGACY_PRESET_WIDTHS[preset];
  const colIndex = Math.max(0, Math.min(slotIndex, widths.length - 1));

  return {
    rowId: layout.rowId,
    rowIndex: Math.max(0, rowIndex),
    colIndex,
    widthPct: widths[colIndex],
  };
}

function normalizeLeaves(leaves: Leaf[] | undefined, fallbackIcon: string): Leaf[] {
  if (!Array.isArray(leaves)) return [];

  return leaves.map((leaf) => ({
    id: leaf.id || cryptoRandomId(),
    name: leaf.name || 'Untitled',
    url: normalizeUrl(leaf.url || ''),
    icon: sanitizeSvg(leaf.icon, fallbackIcon),
  }));
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringifyObjectId(value: unknown) {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof (value as any).toHexString === 'function') return (value as any).toHexString();
  if (typeof (value as any).toString === 'function') return (value as any).toString();
  return undefined;
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}
