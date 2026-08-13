// Preset layout skeletons — the designer-authored page shells the user can
// choose between. Unlike the old drag-grid (where the user placed every module
// by hand), a layout owns placement: each skeleton declares regions, and module
// roots are assigned to a region by role. The dashboard data model still stores
// the module list; the layout decides where each one goes.
//
// Five are implemented, from prototypes A / C / K / M / X. A sixth (AB,
// "Split-Category Grid") was scoped but dropped: its skeleton was a sticky aside
// beside a two-column directory grid, which is what the journal already does
// once its main column wraps, and its element styling was identical to sheet's.
// If it comes back it needs a distinguishing idea, not just another region map.

export type LayoutId = 'sheet' | 'ledger' | 'journal' | 'bento' | 'catalog';

export type DensityId = 'compact' | 'normal' | 'airy';

/** Concrete colour modes; 'system' resolves to one of these at runtime. */
export type ThemeMode = 'light' | 'dark';

/** A named area within a skeleton that module roots get assigned to. */
export type RegionId = 'lead' | 'main' | 'aside' | 'rail' | 'full';

/** Dashboard section roots, mirroring Tree.root in lib/types. */
export type SectionRoot =
  | 'bookmarks'
  | 'applications'
  | 'servers'
  | 'weather'
  | 'calendar'
  | 'markets'
  | 'media'
  | 'posts';

export interface LayoutDefinition {
  id: LayoutId;
  /** Shown in the Settings picker. */
  label: string;
  /** One-line description of the shell, shown under the label. */
  hint: string;
  /**
   * The masthead wordmark. Each prototype names the product differently — the
   * catalogue sets it in title case as a statement, the journal and the grid
   * give it a full title — so this is content, not styling.
   */
  wordmark: string;
  /** Applied automatically when the user picks this layout. */
  defaultTheme: 'light' | 'dark' | 'system';
  defaultDensity: DensityId;
  /**
   * Which region each section root renders into. Roots absent from the map fall
   * back to 'main', so adding a new root never breaks a layout.
   */
  regions: Partial<Record<SectionRoot, RegionId>>;
  /**
   * Reading order within a region. The stored dashboard keeps the user's own
   * module order, but a preset owns composition — prototype K, for instance,
   * always opens its sidebar with the weather. Roots left out of this list sort
   * after the listed ones, keeping their relative dashboard order.
   */
  order?: SectionRoot[];
  /**
   * Tile footprints, for grid skeletons only. Keyed by root so a module keeps
   * its designed size no matter where it falls in the order.
   *
   * These must be complete, literal Tailwind class names — the scanner reads this
   * file (see tailwind.config.js content globs) and anything it cannot see as a
   * literal is never generated, so the tile silently falls back to 1x1.
   */
  spans?: Partial<Record<SectionRoot, string>>;
}

// Region intent, shared across skeletons so assignment reads consistently:
//   lead   — the hero/identity strip (greeting, weather, at-a-glance)
//   main   — the primary reading column (posts, applications)
//   aside  — a secondary column, often sticky (calendar, markets)
//   rail   — a narrow tertiary column (servers, media telemetry)
//   full   — spans the whole shell width
export const LAYOUTS: Record<LayoutId, LayoutDefinition> = {
  sheet: {
    id: 'sheet',
    wordmark: 'OPAQUE',
    label: 'Filed Sheet',
    hint: 'Centred document page, main column with a slim side rail.',
    defaultTheme: 'light',
    defaultDensity: 'normal',
    // Prototype A: servers then posts fill the wide column; the narrow rail opens
    // with weather, then the app registry and the bookmark index.
    regions: {
      servers: 'main',
      posts: 'main',
      media: 'main',
      bookmarks: 'main',
      weather: 'aside',
      applications: 'aside',
      calendar: 'aside',
      markets: 'aside',
    },
    order: ['servers', 'posts', 'media', 'bookmarks', 'weather', 'applications', 'calendar', 'markets'],
  },
  ledger: {
    id: 'ledger',
    wordmark: 'OPAQUE',
    label: 'Dark Ledger',
    hint: 'Two dense columns; data-forward, tabular telemetry.',
    defaultTheme: 'dark',
    defaultDensity: 'compact',
    regions: {
      weather: 'lead',
      servers: 'main',
      markets: 'main',
      media: 'main',
      applications: 'aside',
      posts: 'aside',
      bookmarks: 'aside',
      calendar: 'aside',
    },
  },
  journal: {
    id: 'journal',
    wordmark: 'The Opaque Archive.',
    label: 'Refined Journal',
    hint: 'Sticky index sidebar beside a wide reading column.',
    defaultTheme: 'light',
    defaultDensity: 'normal',
    // Prototype K: the sticky left column runs Atmosphere → Markets → Directory;
    // media, telemetry and the reading log fill the wide right column.
    regions: {
      weather: 'aside',
      markets: 'aside',
      applications: 'aside',
      calendar: 'aside',
      bookmarks: 'aside',
      media: 'main',
      servers: 'main',
      posts: 'main',
    },
    order: ['weather', 'markets', 'applications', 'calendar', 'bookmarks', 'media', 'servers', 'posts'],
  },
  bento: {
    id: 'bento',
    wordmark: 'The Opaque Grid.',
    label: 'Bento Grid',
    hint: 'Hairline-separated tiles on an even four-column grid.',
    defaultTheme: 'light',
    defaultDensity: 'compact',
    // One grid, so every tile lives in 'main'; composition comes from the spans.
    regions: {
      weather: 'main',
      media: 'main',
      markets: 'main',
      posts: 'main',
      servers: 'main',
      applications: 'main',
      bookmarks: 'main',
      calendar: 'main',
    },
    // Prototype M's arrangement: a tall weather tile anchors the left edge, media
    // runs wide beside it, and the reading log takes the big lower-right block.
    order: ['weather', 'media', 'markets', 'posts', 'servers', 'applications', 'calendar', 'bookmarks'],
    spans: {
      weather: 'md:col-span-1 md:row-span-2',
      media: 'md:col-span-2',
      markets: 'md:col-span-1',
      posts: 'md:col-span-2 md:row-span-2',
      servers: 'md:col-span-1 md:row-span-2',
      applications: 'md:col-span-1',
      calendar: 'md:col-span-2',
      bookmarks: 'md:col-span-2',
    },
  },
  catalog: {
    id: 'catalog',
    wordmark: 'Opaque.',
    label: 'Catalog',
    hint: 'Three columns, category-grouped, wide canvas.',
    defaultTheme: 'dark',
    defaultDensity: 'normal',
    // Prototype X: a narrow instrument rail (atmosphere, telemetry) beside two
    // equally wide catalogue columns — applications on the left, the log right.
    regions: {
      weather: 'rail',
      servers: 'rail',
      markets: 'rail',
      calendar: 'rail',
      applications: 'main',
      bookmarks: 'main',
      posts: 'aside',
      media: 'aside',
    },
    order: ['weather', 'servers', 'markets', 'calendar', 'applications', 'bookmarks', 'posts', 'media'],
  },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS) as LayoutId[];

export const DENSITIES: { id: DensityId; label: string }[] = [
  { id: 'compact', label: 'Compact' },
  { id: 'normal', label: 'Standard' },
  { id: 'airy', label: 'Airy' },
];

export function isLayoutId(value: unknown): value is LayoutId {
  return typeof value === 'string' && value in LAYOUTS;
}

export function isDensityId(value: unknown): value is DensityId {
  return value === 'compact' || value === 'normal' || value === 'airy';
}

/** Which region a root belongs to in the given layout ('main' when unmapped). */
export function regionFor(layout: LayoutId, root: string): RegionId {
  const definition = LAYOUTS[layout];
  const mapped = definition.regions[root as SectionRoot];
  return mapped ?? 'main';
}

/** A tree carrying the optional per-layout ordering the user has saved. */
export interface OrderableTree {
  root: string;
  order?: Partial<Record<string, number>>;
}

/**
 * Sort roots for display in the given layout.
 *
 * Precedence is: an explicit per-layout position the user saved, then the
 * layout's authored order, then the stored dashboard order. Recording the user's
 * choice explicitly matters — a stored forest that differs from the preset is
 * indistinguishable from one merely saved in canonical root order, so inferring
 * "already customised" from a mismatch would make every fresh dashboard skip its
 * preset and never look like the prototype.
 */
export function orderRoots<T extends OrderableTree>(layout: LayoutId, trees: T[]): T[] {
  const authored = LAYOUTS[layout].order;
  const rank = new Map((authored ?? []).map((root, index) => [root as string, index]));
  const fallback = (authored ?? []).length;

  const keyFor = (tree: T, index: number): [number, number, number] => {
    const saved = tree.order?.[layout];
    // Saved positions sort ahead of everything, in their own recorded sequence.
    if (typeof saved === 'number') return [0, saved, index];
    return [1, rank.get(tree.root) ?? fallback, index];
  };

  return [...trees]
    .map((tree, index) => ({ tree, key: keyFor(tree, index) }))
    .sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1] || a.key[2] - b.key[2])
    .map((entry) => entry.tree);
}

/** True once the user has saved an explicit arrangement for this layout. */
export function hasSavedOrder<T extends OrderableTree>(layout: LayoutId, trees: T[]): boolean {
  return trees.some((tree) => typeof tree.order?.[layout] === 'number');
}

/**
 * Move a root one step up or down *within its own region*, returning a new
 * forest. The layout owns which column a module lives in, so this deliberately
 * cannot move anything across regions.
 *
 * The result stamps an explicit per-layout position onto every tree, so the
 * arrangement is recorded as deliberate rather than left to be re-derived from
 * array order later.
 */
export function reorderWithinRegion<T extends OrderableTree>(
  layout: LayoutId,
  forest: T[],
  root: string,
  direction: -1 | 1,
): T[] {
  const view = orderRoots(layout, forest);
  const siblings = view.filter((tree) => regionFor(layout, tree.root) === regionFor(layout, root));
  const current = siblings.findIndex((tree) => tree.root === root);
  const target = current + direction;
  if (current < 0 || target < 0 || target >= siblings.length) return forest;

  // Swap the pair within the region, then re-stamp the whole view so the saved
  // positions describe one coherent sequence.
  const swapped = new Map<string, string>([
    [siblings[current].root, siblings[target].root],
    [siblings[target].root, siblings[current].root],
  ]);
  const resolved = view.map((tree) => {
    const other = swapped.get(tree.root);
    return other ? view.find((candidate) => candidate.root === other)! : tree;
  });

  const position = new Map(resolved.map((tree, index) => [tree.root, index]));
  return forest.map((tree) => ({
    ...tree,
    order: { ...tree.order, [layout]: position.get(tree.root) ?? 0 },
  }));
}

/** Whether a root can still move in the given direction inside its region. */
export function canMoveWithinRegion<T extends OrderableTree>(
  layout: LayoutId,
  forest: T[],
  root: string,
  direction: -1 | 1,
): boolean {
  const region = regionFor(layout, root);
  const siblings = orderRoots(layout, forest)
    .filter((tree) => regionFor(layout, tree.root) === region);
  const index = siblings.findIndex((tree) => tree.root === root);
  const target = index + direction;
  return index >= 0 && target >= 0 && target < siblings.length;
}

/** The tile footprint for a root in a grid layout, if the layout declares one. */
export function spanFor(layout: LayoutId, root: string): string {
  return LAYOUTS[layout].spans?.[root as SectionRoot] ?? '';
}
