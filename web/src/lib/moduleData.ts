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

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  url?: string;
}

export interface CalendarModuleData {
  kind: 'calendar';
  month: string;
  events: CalendarEvent[];
}

export interface MarketQuote {
  symbol: string;
  price: number;
  previousClose: number;
  changePercent: number;
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

export interface MediaModuleData {
  kind: 'media';
  service: string;
  status: 'online';
  detail?: string;
  url: string;
  stats: MediaStat[];
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
  | CalendarModuleData
  | MarketsModuleData
  | MediaModuleData
  | PostsModuleData;

export interface ModuleDataResponse {
  data: ModuleData;
  fetchedAt: string;
}
