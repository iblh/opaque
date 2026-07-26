// Preset layout skeletons — the six designer-authored page shells the user can
// choose between. Unlike the old drag-grid (where the user placed every module
// by hand), a layout owns placement: each skeleton declares regions, and module
// roots are assigned to a region by role. The dashboard data model still stores
// the module list; the layout decides where each one goes.

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
      weather: 'aside',
      applications: 'aside',
      bookmarks: 'aside',
      calendar: 'aside',
      markets: 'aside',
    },
    order: ['servers', 'posts', 'media', 'weather', 'applications', 'bookmarks', 'calendar', 'markets'],
  },
  ledger: {
    id: 'ledger',
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
      servers: 'md:col-span-1',
      applications: 'md:col-span-1',
      calendar: 'md:col-span-2',
      bookmarks: 'md:col-span-2',
    },
  },
  catalog: {
    id: 'catalog',
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

/**
 * Sort roots into the layout's authored reading order. Unlisted roots keep their
 * dashboard order and follow the listed ones, so a newly added module appears at
 * the end of its region rather than disappearing or jumping to the front.
 */
export function orderRoots<T extends { root: string }>(layout: LayoutId, trees: T[]): T[] {
  const order = LAYOUTS[layout].order;
  if (!order) return trees;
  const rank = new Map(order.map((root, index) => [root as string, index]));
  const fallback = order.length;
  return [...trees].sort(
    (a, b) => (rank.get(a.root) ?? fallback) - (rank.get(b.root) ?? fallback),
  );
}

/** The tile footprint for a root in a grid layout, if the layout declares one. */
export function spanFor(layout: LayoutId, root: string): string {
  return LAYOUTS[layout].spans?.[root as SectionRoot] ?? '';
}
