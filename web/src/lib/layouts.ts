// Preset layout skeletons — the six designer-authored page shells the user can
// choose between. Unlike the old drag-grid (where the user placed every module
// by hand), a layout owns placement: each skeleton declares regions, and module
// roots are assigned to a region by role. The dashboard data model still stores
// the module list; the layout decides where each one goes.

export type LayoutId = 'sheet' | 'ledger' | 'journal' | 'split' | 'bento' | 'catalog';

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
    regions: {
      weather: 'lead',
      posts: 'main',
      applications: 'main',
      bookmarks: 'main',
      calendar: 'aside',
      markets: 'aside',
      servers: 'aside',
      media: 'aside',
    },
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
    regions: {
      weather: 'aside',
      calendar: 'aside',
      markets: 'aside',
      posts: 'main',
      applications: 'main',
      bookmarks: 'main',
      servers: 'aside',
      media: 'main',
    },
  },
  split: {
    id: 'split',
    label: 'Split Category',
    hint: 'Sticky aside with a category-grouped directory grid.',
    defaultTheme: 'system',
    defaultDensity: 'normal',
    regions: {
      weather: 'aside',
      servers: 'aside',
      calendar: 'aside',
      markets: 'aside',
      applications: 'main',
      bookmarks: 'main',
      posts: 'main',
      media: 'main',
    },
  },
  bento: {
    id: 'bento',
    label: 'Bento Grid',
    hint: 'Hairline-separated tiles on an even four-column grid.',
    defaultTheme: 'light',
    defaultDensity: 'compact',
    regions: {
      weather: 'lead',
      media: 'main',
      posts: 'main',
      applications: 'main',
      servers: 'rail',
      markets: 'rail',
      calendar: 'rail',
      bookmarks: 'main',
    },
  },
  catalog: {
    id: 'catalog',
    label: 'Catalog',
    hint: 'Three columns, category-grouped, wide canvas.',
    defaultTheme: 'dark',
    defaultDensity: 'normal',
    regions: {
      weather: 'lead',
      servers: 'rail',
      markets: 'rail',
      calendar: 'rail',
      applications: 'main',
      bookmarks: 'main',
      posts: 'aside',
      media: 'aside',
    },
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
