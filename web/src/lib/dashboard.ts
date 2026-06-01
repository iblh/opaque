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
import { DASHBOARD_ROOTS, isModuleRoot } from '@/lib/modules';

export const DEFAULT_ROOTS: DashboardRoot[] = [...DASHBOARD_ROOTS];
export const LAYOUT_PRESETS: LayoutPreset[] = ['100', '50/50', '33/33/33', '20/60/20'];

export function createEmptyDashboard(identity: DashboardIdentity = {}): Dashboard {
  return {
    ...identity,
    forest: DEFAULT_ROOTS.map((root) => ({ root, branches: [] })),
  };
}

export function normalizeDashboard(
  dashboard: Partial<Dashboard> | null | undefined,
  identity: DashboardIdentity = {},
): Dashboard {
  const source = dashboard || {};
  const fallbackBranches = Array.isArray((source as any).branches)
    ? [{ root: 'bookmarks', branches: (source as any).branches }]
    : [];
  const sourceForest = Array.isArray(source.forest) ? source.forest : fallbackBranches;
  const byRoot = new Map<string, Tree>();

  sourceForest.forEach((tree) => {
    if (!tree?.root) return;
    byRoot.set(tree.root, normalizeTree(tree));
  });

  const defaultTrees = DEFAULT_ROOTS.map((root) => byRoot.get(root) || { root, branches: [] });
  const customTrees = [...byRoot.values()].filter((tree) => !DEFAULT_ROOTS.includes(tree.root));

  return {
    ...source,
    ...identity,
    id: stringifyObjectId((source as any)._id) || source.id,
    forest: [...defaultTrees, ...customTrees],
  };
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
  return {
    root: tree.root,
    layout: normalizeLayout((tree as any).layout),
    branches: Array.isArray(tree.branches)
      ? tree.branches.map((branch) => normalizeBranch(tree.root, branch)).filter(Boolean) as Branch[]
      : [],
  };
}

function normalizeBranch(root: string, branch: Branch): Branch {
  const base = {
    ...branch,
    id: branch.id || cryptoRandomId(),
    name: branch.name || 'Untitled',
  } as Branch;

  if (root === 'servers') {
    return {
      ...base,
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
    return {
      ...base,
      moduleType: typeof (base as any).moduleType === 'string'
        ? (base as any).moduleType
        : 'unknown',
      enabled: (base as any).enabled !== false,
      config: isPlainObject((base as any).config) ? (base as any).config : {},
    } as Branch;
  }

  return {
    ...base,
    leaves: normalizeLeaves((base as any).leaves, DEFAULT_BOOKMARK_ICON),
  } as Branch;
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
