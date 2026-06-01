import { DashboardRoot, KnownModuleType, ModuleBranch } from '@/lib/types';

export const CORE_ROOTS = ['bookmarks', 'applications', 'servers'] as const;
export const MODULE_ROOTS = ['today', 'media', 'posts'] as const;
export const DASHBOARD_ROOTS = [...CORE_ROOTS, ...MODULE_ROOTS] as const;

export const ROOT_LABELS: Record<string, string> = {
  bookmarks: 'Bookmarks',
  applications: 'Applications',
  servers: 'Servers',
  today: 'Today',
  media: 'Media',
  posts: 'Posts',
};

export const MODULES_BY_ROOT: Record<string, KnownModuleType[]> = {
  today: ['weather', 'calendar', 'markets'],
  media: ['plex', 'jellyfin', 'emby', 'radarr', 'sonarr'],
  posts: ['rss', 'hacker-news', 'reddit'],
};

export const DEFAULT_MODULES_BY_ROOT: Record<string, KnownModuleType[]> = {
  today: ['weather', 'calendar', 'markets'],
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
      return { location: 'San Francisco', units: 'imperial' };
    case 'calendar':
      return { source: 'local', days: 7 };
    case 'markets':
      return { symbols: ['SPY', 'AAPL', 'NVDA', 'BTC-USD'] };
    case 'plex':
      return { url: 'https://plex.local' };
    case 'jellyfin':
      return { url: 'https://jellyfin.local' };
    case 'emby':
      return { url: 'https://emby.local' };
    case 'radarr':
      return { url: 'https://radarr.local' };
    case 'sonarr':
      return { url: 'https://sonarr.local' };
    case 'rss':
      return { feeds: ['https://example.com/feed.xml'], limit: 5 };
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
