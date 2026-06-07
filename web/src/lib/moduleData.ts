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
