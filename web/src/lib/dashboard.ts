import { Dashboard, DashboardIdentity, Tree, Branch, Leaf } from '@/lib/types';
import {
  DEFAULT_APPLICATION_ICON,
  DEFAULT_BOOKMARK_ICON,
  DEFAULT_SERVER_ICON,
  sanitizeSvg,
} from '@/lib/svg';

export const DEFAULT_ROOTS = ['bookmarks', 'applications', 'servers'];

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

  return {
    ...base,
    leaves: normalizeLeaves((base as any).leaves, DEFAULT_BOOKMARK_ICON),
  } as Branch;
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
