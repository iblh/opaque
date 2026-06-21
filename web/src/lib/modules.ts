import { DashboardRoot, KnownModuleType, ModuleBranch } from '@/lib/types';

export const CORE_ROOTS = ['bookmarks', 'applications', 'servers'] as const;
// weather / calendar / markets are single-module roots: each is its own
// top-level section holding exactly one module of the same name, so they can
// be placed and resized independently on the layout grid. media / posts remain
// multi-module roots (media: several servers; posts: tab groups).
export const SINGLE_MODULE_ROOTS = ['weather', 'calendar', 'markets'] as const;
export const MODULE_ROOTS = [...SINGLE_MODULE_ROOTS, 'media', 'posts'] as const;
export const DASHBOARD_ROOTS = [...CORE_ROOTS, ...MODULE_ROOTS] as const;

export const ROOT_LABELS: Record<string, string> = {
  bookmarks: 'Bookmarks',
  applications: 'Applications',
  servers: 'Servers',
  weather: 'Weather',
  calendar: 'Calendar',
  markets: 'Markets',
  media: 'Media',
  posts: 'Posts',
};

export const MODULES_BY_ROOT: Record<string, KnownModuleType[]> = {
  weather: ['weather'],
  calendar: ['calendar'],
  markets: ['markets'],
  media: ['plex', 'jellyfin', 'emby', 'radarr', 'sonarr'],
  posts: ['rss', 'hacker-news', 'reddit'],
};

export const DEFAULT_MODULES_BY_ROOT: Record<string, KnownModuleType[]> = {
  weather: ['weather'],
  calendar: ['calendar'],
  markets: ['markets'],
  media: ['plex', 'jellyfin', 'radarr', 'sonarr'],
  posts: ['rss', 'hacker-news', 'reddit'],
};

export const MODULE_LABELS: Record<KnownModuleType, string> = {
  weather: 'Weather',
  calendar: 'Calendar',
  markets: 'Markets',
  plex: 'Plex',
  jellyfin: 'Jellyfin',
  emby: 'Emby',
  radarr: 'Radarr',
  sonarr: 'Sonarr',
  rss: 'RSS',
  reddit: 'Reddit',
  'hacker-news': 'Hacker News',
};

export function isModuleRoot(root: string): root is typeof MODULE_ROOTS[number] {
  return MODULE_ROOTS.includes(root as typeof MODULE_ROOTS[number]);
}

// A root that holds exactly one fixed module (weather/calendar/markets). These
// can't gain or reorder modules — their position is controlled by the layout
// grid, not by intra-root drag — so the add-module / drag affordances are off.
export function isSingleModuleRoot(root: string): root is typeof SINGLE_MODULE_ROOTS[number] {
  return SINGLE_MODULE_ROOTS.includes(root as typeof SINGLE_MODULE_ROOTS[number]);
}

export function getRootLabel(root: DashboardRoot) {
  return ROOT_LABELS[root] || titleize(String(root));
}

export function getAllowedModuleTypes(root: string) {
  return MODULES_BY_ROOT[root] || [];
}

export function isKnownModuleType(moduleType: string): moduleType is KnownModuleType {
  return Boolean((MODULE_LABELS as Record<string, string>)[moduleType]);
}

export function createDefaultModulesForRoot(root: string): ModuleBranch[] {
  return (DEFAULT_MODULES_BY_ROOT[root] || []).map((moduleType) => (
    createDefaultModuleBranch(moduleType)
  ));
}

export function createDefaultModuleBranch(moduleType: KnownModuleType): ModuleBranch {
  return {
    id: newId(),
    name: MODULE_LABELS[moduleType],
    moduleType,
    enabled: true,
    config: createDefaultModuleConfig(moduleType),
  };
}

function createDefaultModuleConfig(moduleType: KnownModuleType) {
  switch (moduleType) {
    case 'weather':
      return { location: 'San Francisco', countryCode: 'US', region: '', units: 'imperial' };
    case 'calendar':
      return {};
    case 'markets':
      return { symbols: ['SPY', 'BTC-USD', 'NVDA', 'AAPL', 'MSFT'] };
    case 'plex':
      return { url: '', token: '' };
    case 'jellyfin':
      return { url: '', apiKey: '' };
    case 'emby':
      return { url: '', apiKey: '' };
    case 'radarr':
      return { url: '', apiKey: '' };
    case 'sonarr':
      return { url: '', apiKey: '' };
    case 'rss':
      return { feeds: [], limit: 5 };
    // reddit/hacker-news also accept an optional advanced `baseUrl` (http/https):
    // point the upstream at a self-hosted relay/proxy instead of the public host.
    // Omitted by default; see optionalHttpBase in moduleProviders.ts.
    case 'reddit':
      return { subreddit: 'selfhosted', sort: 'hot', limit: 5 };
    case 'hacker-news':
      return { feed: 'top', limit: 5 };
    default:
      return {};
  }
}

function titleize(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}
