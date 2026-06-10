export interface WeatherForecastDay {
  date: string;
  condition: string;
  high: number;
  low: number;
}

export interface WeatherModuleData {
  kind: 'weather';
  location: string;
  temperature: number;
  temperatureUnit: 'celsius' | 'fahrenheit';
  condition: string;
  humidity: number;
  forecast: WeatherForecastDay[];
}

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  changePercent: number;
  sparkline: number[];
  currency?: string;
}

export interface MarketsModuleData {
  kind: 'markets';
  quotes: MarketQuote[];
}

export interface MediaStat {
  label: string;
  value: string | number;
}

export interface MediaLibraryStat {
  id: string;
  name: string;
  count: number;
  type?: string;
}

export interface MediaRecentItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  url?: string;
  /** ISO timestamp the item was added to the library, when known. */
  addedAt?: string;
}

export interface MediaNowPlayingItem {
  id: string;
  title: string;
  subtitle?: string;
  /** Who is watching / listening. */
  user?: string;
  /** Player / device name. */
  device?: string;
  /** Playback progress 0–1, when known. */
  progress?: number;
  /** Whether playback is paused. */
  paused?: boolean;
  imageUrl?: string;
}

export interface MediaQueueItem {
  id: string;
  title: string;
  subtitle?: string;
  /** Download progress 0–1, when known. */
  progress?: number;
  /** Status label, e.g. "downloading", "queued". */
  status?: string;
}

export interface MediaModuleData {
  kind: 'media';
  service: string;
  status: 'online';
  detail?: string;
  url: string;
  stats: MediaStat[];
  libraries?: MediaLibraryStat[];
  recent?: MediaRecentItem[];
  /** Active playback sessions (Plex / Jellyfin / Emby). */
  nowPlaying?: MediaNowPlayingItem[];
  /** Active download queue items (Sonarr / Radarr). */
  queue?: MediaQueueItem[];
  /** ISO timestamp of the most recently added item, for a "last added" hint. */
  lastAddedAt?: string;
}

export interface PostItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  meta?: string;
}

export interface PostsModuleData {
  kind: 'posts';
  provider: string;
  posts: PostItem[];
}

export type ModuleData =
  | WeatherModuleData
  | MarketsModuleData
  | MediaModuleData
  | PostsModuleData;

export interface ModuleDataResponse {
  data: ModuleData;
  fetchedAt: string;
}
