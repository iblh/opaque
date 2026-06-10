import { XMLParser } from 'fast-xml-parser';
import type {
  MarketQuote,
  MediaLibraryStat,
  MediaModuleData,
  MediaNowPlayingItem,
  MediaQueueItem,
  MediaRecentItem,
  ModuleData,
  PostItem,
} from '@/lib/moduleData';
import type { ModuleBranch } from '@/lib/types';

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_TEXT_RESPONSE_LENGTH = 2_000_000;
const MAX_IMAGE_RESPONSE_LENGTH = 5_000_000;
const USER_AGENT = 'OPAQUE/0.1 personal dashboard';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  removeNSPrefix: true,
});

const COUNTRY_ALIASES: Record<string, string> = {
  us: 'US',
  usa: 'US',
  'u s': 'US',
  'u s a': 'US',
  america: 'US',
  'united states': 'US',
  'united states of america': 'US',
  canada: 'CA',
  uk: 'GB',
  'united kingdom': 'GB',
  britain: 'GB',
  england: 'GB',
};

const US_STATE_ABBREVIATIONS: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

const US_STATE_NAMES = Object.fromEntries(
  Object.values(US_STATE_ABBREVIATIONS).map((state) => [normalizeSearchText(state), state]),
) as Record<string, string>;

type JsonObject = Record<string, unknown>;

interface WeatherLocationQuery {
  raw: string;
  name: string;
  countryCode: string;
  region: string;
}

export class ModuleDataError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'ModuleDataError';
    this.status = status;
  }
}

export async function fetchModuleData(module: ModuleBranch): Promise<ModuleData> {
  switch (module.moduleType) {
    case 'weather':
      return fetchWeather(module);
    case 'markets':
      return fetchMarkets(module);
    case 'plex':
      return fetchPlex(module);
    case 'jellyfin':
    case 'emby':
      return fetchJellyfinLike(module);
    case 'radarr':
    case 'sonarr':
      return fetchArr(module);
    case 'rss':
      return fetchRss(module);
    case 'reddit':
      return fetchReddit(module);
    case 'hacker-news':
      return fetchHackerNews(module);
    default:
      throw new ModuleDataError('Unsupported module type.', 400);
  }
}

export async function fetchModuleImage(
  module: ModuleBranch,
  path: string,
): Promise<{ body: ArrayBuffer; contentType: string }> {
  const endpoint = mediaImageEndpoint(path);

  switch (module.moduleType) {
    case 'plex': {
      const configuredUrl = requiredHttpUrl(configString(module, 'url'), 'Add a Plex URL in edit mode.');
      const token = configString(module, 'token') || configString(module, 'apiKey');
      if (!token) throw new ModuleDataError('Add a Plex token in edit mode.', 400);

      const target = await resolvePlexTarget(configuredUrl, token);
      return fetchImage(
        serviceEndpoint(target.baseUrl, endpoint),
        { headers: { ...plexHeaders(target.token), Accept: 'image/*' } },
        'Plex image',
      );
    }
    case 'jellyfin':
    case 'emby': {
      const service = module.moduleType === 'emby' ? 'Emby' : 'Jellyfin';
      const baseUrl = requiredHttpUrl(configString(module, 'url'), `Add a ${service} URL in edit mode.`);
      const apiKey = configString(module, 'apiKey') || configString(module, 'token');
      if (!apiKey) throw new ModuleDataError(`Add a ${service} API key in edit mode.`, 400);

      return fetchImage(
        serviceEndpoint(baseUrl, endpoint),
        { headers: { ...jellyfinLikeHeaders(module.moduleType, apiKey), Accept: 'image/*' } },
        `${service} image`,
      );
    }
    case 'radarr':
    case 'sonarr': {
      const service = module.moduleType === 'sonarr' ? 'Sonarr' : 'Radarr';
      const baseUrl = requiredHttpUrl(configString(module, 'url'), `Add a ${service} URL in edit mode.`);
      const apiKey = configString(module, 'apiKey') || configString(module, 'token');
      if (!apiKey) throw new ModuleDataError(`Add a ${service} API key in edit mode.`, 400);

      return fetchImage(
        serviceEndpoint(baseUrl, endpoint),
        { headers: { Accept: 'image/*', 'X-Api-Key': apiKey } },
        `${service} image`,
      );
    }
    default:
      throw new ModuleDataError('This module does not expose media images.', 400);
  }
}

async function fetchWeather(module: ModuleBranch): Promise<ModuleData> {
  const location = configString(module, 'location', 'San Francisco');
  const countryCodeConfig = hasConfigKey(module, 'countryCode')
    ? optionalConfigString(module, 'countryCode')
    : 'US';
  const locationQuery = parseWeatherLocation(
    location,
    countryCodeConfig,
    optionalConfigString(module, 'region'),
  );
  const units = configString(module, 'units', 'imperial') === 'metric'
    ? 'celsius'
    : 'fahrenheit';

  const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
  geocodeUrl.searchParams.set('name', locationQuery.name);
  geocodeUrl.searchParams.set('count', '10');
  geocodeUrl.searchParams.set('language', 'en');
  geocodeUrl.searchParams.set('format', 'json');
  if (locationQuery.countryCode) {
    geocodeUrl.searchParams.set('countryCode', locationQuery.countryCode);
  }

  const geocode = await fetchJson(geocodeUrl, {}, 'weather location service');
  const place = selectWeatherPlace(
    arrayValue(valueOf(asObject(geocode), 'results')).map(asObject),
    locationQuery,
  );
  const latitude = finiteNumber(valueOf(place, 'latitude'));
  const longitude = finiteNumber(valueOf(place, 'longitude'));

  if (latitude === null || longitude === null) {
    const hint = locationQuery.countryCode
      ? ` Try adding a state/region, for example "${locationQuery.name}, CA".`
      : ' Try adding a country or state/region.';
    throw new ModuleDataError(`No weather location found for "${location}".${hint}`, 400);
  }

  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
  forecastUrl.searchParams.set('latitude', String(latitude));
  forecastUrl.searchParams.set('longitude', String(longitude));
  forecastUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code');
  forecastUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
  forecastUrl.searchParams.set('temperature_unit', units);
  forecastUrl.searchParams.set('timezone', 'auto');
  forecastUrl.searchParams.set('forecast_days', '4');

  const payload = asObject(await fetchJson(forecastUrl, {}, 'weather forecast service'));
  const current = asObject(valueOf(payload, 'current'));
  const daily = asObject(valueOf(payload, 'daily'));
  const dates = arrayValue(valueOf(daily, 'time'));
  const codes = arrayValue(valueOf(daily, 'weather_code'));
  const highs = arrayValue(valueOf(daily, 'temperature_2m_max'));
  const lows = arrayValue(valueOf(daily, 'temperature_2m_min'));

  return {
    kind: 'weather',
    location: formatWeatherLocation(place, location),
    temperature: requiredNumber(valueOf(current, 'temperature_2m'), 'Weather temperature is unavailable.'),
    temperatureUnit: units,
    condition: weatherCodeLabel(finiteNumber(valueOf(current, 'weather_code'))),
    humidity: requiredNumber(valueOf(current, 'relative_humidity_2m'), 'Weather humidity is unavailable.'),
    forecast: dates.slice(0, 3).flatMap((date, index) => {
      const high = finiteNumber(highs[index]);
      const low = finiteNumber(lows[index]);
      if (typeof date !== 'string' || high === null || low === null) return [];

      return [{
        date,
        condition: weatherCodeLabel(finiteNumber(codes[index])),
        high,
        low,
      }];
    }),
  };
}

async function fetchMarkets(module: ModuleBranch): Promise<ModuleData> {
  const symbols = configList(module, 'symbols', defaultMarketSymbols())
    .map((symbol) => symbol.toUpperCase())
    .slice(0, 8);

  if (symbols.length === 0) {
    throw new ModuleDataError('Add at least one market symbol in edit mode.', 400);
  }

  const results = await Promise.allSettled(symbols.map(fetchMarketQuote));
  const quotes = results.flatMap((result) => (
    result.status === 'fulfilled' ? [result.value] : []
  ));

  if (quotes.length === 0) {
    throw new ModuleDataError('No market quotes could be loaded. Check the configured symbols.');
  }

  return {
    kind: 'markets',
    quotes,
  };
}

async function fetchMarketQuote(symbol: string): Promise<MarketQuote> {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set('range', '1mo');
  url.searchParams.set('interval', '1d');

  const payload = asObject(await fetchJson(url, {}, `market quote for ${symbol}`));
  const chart = asObject(valueOf(payload, 'chart'));
  const result = asObject(arrayValue(valueOf(chart, 'result'))[0]);
  const meta = asObject(valueOf(result, 'meta'));
  const indicators = asObject(valueOf(result, 'indicators'));
  const quote = asObject(arrayValue(valueOf(indicators, 'quote'))[0]);
  const closes = arrayValue(valueOf(quote, 'close'))
    .map(finiteNumber)
    .filter((value): value is number => value !== null);
  const price = finiteNumber(valueOf(meta, 'regularMarketPrice')) ?? closes.at(-1) ?? null;
  const previousClose = finiteNumber(valueOf(meta, 'chartPreviousClose', 'previousClose'))
    ?? closes.at(-2)
    ?? price;

  if (price === null || previousClose === null) {
    throw new ModuleDataError(`Quote unavailable for ${symbol}.`);
  }

  return {
    symbol: stringValue(valueOf(meta, 'symbol')) || symbol,
    name: marketDisplayName(symbol, meta),
    price,
    previousClose,
    changePercent: previousClose === 0 ? 0 : ((price - previousClose) / previousClose) * 100,
    sparkline: marketSparkline(closes, price, previousClose),
    currency: stringValue(valueOf(meta, 'currency')) || undefined,
  };
}

async function fetchPlex(module: ModuleBranch): Promise<MediaModuleData> {
  const configuredUrl = requiredHttpUrl(configString(module, 'url'), 'Add a Plex URL in edit mode.');
  const token = configString(module, 'token') || configString(module, 'apiKey');
  if (!token) {
    throw new ModuleDataError('Add a Plex token in edit mode.', 400);
  }

  const target = await resolvePlexTarget(configuredUrl, token);
  const headers = plexHeaders(target.token);

  const [sections, sessions, recent] = await Promise.all([
    fetchJson(serviceEndpoint(target.baseUrl, 'library/sections'), { headers }, 'Plex'),
    fetchJson(serviceEndpoint(target.baseUrl, 'status/sessions'), { headers }, 'Plex'),
    fetchJson(
      serviceEndpoint(target.baseUrl, 'library/recentlyAdded?X-Plex-Container-Start=0&X-Plex-Container-Size=4'),
      { headers },
      'Plex',
    ),
  ]);

  const sectionContainer = mediaContainer(sections);
  const sessionContainer = mediaContainer(sessions);
  const recentContainer = mediaContainer(recent);
  const sectionsList = arrayValue(valueOf(sectionContainer, 'Directory')).map(asObject);
  const libraries = await fetchPlexLibraries(target.baseUrl, headers, sectionsList);
  const recentItems = arrayValue(valueOf(recentContainer, 'Metadata'))
    .map(asObject)
    .slice(0, 4)
    .flatMap((item) => plexRecentItem(module.id, item));
  const nowPlaying = plexNowPlaying(module.id, sessionContainer);

  return {
    kind: 'media',
    service: 'Plex',
    status: 'online',
    detail: target.detail,
    url: cleanBaseUrl(target.baseUrl),
    stats: [
      { label: 'Streams', value: finiteNumber(valueOf(sessionContainer, 'size')) ?? activePlexStreams(sessionContainer) },
    ],
    libraries,
    recent: recentItems,
    nowPlaying,
    lastAddedAt: latestAddedAt(recentItems),
  };
}

async function fetchJellyfinLike(module: ModuleBranch): Promise<MediaModuleData> {
  const service = module.moduleType === 'emby' ? 'Emby' : 'Jellyfin';
  const baseUrl = requiredHttpUrl(configString(module, 'url'), `Add a ${service} URL in edit mode.`);
  const apiKey = configString(module, 'apiKey') || configString(module, 'token');
  if (!apiKey) {
    throw new ModuleDataError(`Add a ${service} API key in edit mode.`, 400);
  }

  const headers = jellyfinLikeHeaders(module.moduleType, apiKey);

  const [counts, sessions, folders, recent] = await Promise.all([
    fetchJson(serviceEndpoint(baseUrl, 'Items/Counts'), { headers }, service),
    fetchJson(serviceEndpoint(baseUrl, 'Sessions'), { headers }, service),
    fetchJson(serviceEndpoint(baseUrl, 'Library/MediaFolders'), { headers }, service),
    fetchJson(
      serviceEndpoint(
        baseUrl,
        'Items?sortBy=DateCreated&sortOrder=Descending&limit=4&recursive=true&includeItemTypes=Movie,Series,Episode',
      ),
      { headers },
      service,
    ),
  ]);

  const folderItems = arrayValue(valueOf(asObject(folders), 'Items', 'items'));
  const libraries = await fetchJellyfinLikeLibraries(baseUrl, headers, folderItems.map(asObject), service);
  const sessionItems = arrayValue(sessions);
  const recentItems = arrayValue(valueOf(asObject(recent), 'Items', 'items'))
    .map(asObject)
    .slice(0, 4)
    .flatMap((item) => jellyfinLikeRecentItem(module.id, item));
  const nowPlaying = jellyfinLikeNowPlaying(module.id, sessionItems);

  return {
    kind: 'media',
    service,
    status: 'online',
    url: cleanBaseUrl(baseUrl),
    stats: [
      {
        label: 'Streams',
        value: nowPlaying.length,
      },
    ],
    libraries: libraries.length > 0
      ? libraries
      : [{
          id: 'all',
          name: 'All media',
          count: mediaItemCount(asObject(counts)),
        }],
    recent: recentItems,
    nowPlaying,
    lastAddedAt: latestAddedAt(recentItems),
  };
}

async function fetchArr(module: ModuleBranch): Promise<MediaModuleData> {
  const service = module.moduleType === 'sonarr' ? 'Sonarr' : 'Radarr';
  const collectionPath = module.moduleType === 'sonarr' ? 'series' : 'movie';
  const baseUrl = requiredHttpUrl(configString(module, 'url'), `Add a ${service} URL in edit mode.`);
  const apiKey = configString(module, 'apiKey') || configString(module, 'token');
  if (!apiKey) {
    throw new ModuleDataError(`Add a ${service} API key in edit mode.`, 400);
  }

  const headers = {
    Accept: 'application/json',
    'X-Api-Key': apiKey,
  };
  const isSonarr = module.moduleType === 'sonarr';
  const queueParams = isSonarr
    ? 'api/v3/queue?page=1&pageSize=4&includeSeries=true&includeEpisode=true'
    : 'api/v3/queue?page=1&pageSize=4&includeMovie=true';
  const [status, collection, queue, missing] = await Promise.all([
    fetchJson(serviceEndpoint(baseUrl, 'api/v3/system/status'), { headers }, service),
    fetchJson(serviceEndpoint(baseUrl, `api/v3/${collectionPath}`), { headers }, service),
    fetchJson(serviceEndpoint(baseUrl, queueParams), { headers }, service),
    fetchJson(serviceEndpoint(baseUrl, 'api/v3/wanted/missing?page=1&pageSize=1'), { headers }, service),
  ]);

  const items = arrayValue(collection).map(asObject);
  const recentItems = [...items].sort((a, b) => (
    Date.parse(stringValue(valueOf(b, 'added')) || '') - Date.parse(stringValue(valueOf(a, 'added')) || '')
  )).slice(0, 4).flatMap((item) => arrRecentItem(module.id, item));
  const statusObject = asObject(status);
  const queueObject = asObject(queue);
  const queueItems = arrQueueItems(arrayValue(valueOf(queueObject, 'records', 'Records')), isSonarr);

  return {
    kind: 'media',
    service,
    status: 'online',
    detail: stringValue(valueOf(statusObject, 'version')) || undefined,
    url: cleanBaseUrl(baseUrl),
    stats: [
      { label: isSonarr ? 'Series' : 'Movies', value: items.length },
      { label: 'Missing', value: finiteNumber(valueOf(asObject(missing), 'totalRecords')) ?? 0 },
      { label: 'Queue', value: finiteNumber(valueOf(queueObject, 'totalRecords')) ?? 0 },
    ],
    recent: recentItems,
    queue: queueItems,
    lastAddedAt: latestAddedAt(recentItems),
  };
}

async function fetchRss(module: ModuleBranch): Promise<ModuleData> {
  const feeds = configList(module, 'feeds', []);
  const limit = clamp(configNumber(module, 'limit', 5), 1, 15);

  if (feeds.length === 0) {
    throw new ModuleDataError('Add at least one RSS or Atom feed URL in edit mode.', 400);
  }

  const results = await Promise.allSettled(feeds.slice(0, 5).map(async (feed) => {
    const url = requiredHttpUrl(feed, `Invalid feed URL: ${feed}`);
    const body = await fetchText(
      url,
      { headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8' } },
      'RSS feed',
    );
    return parseFeed(body, url);
  }));
  const posts = results.flatMap((result) => (
    result.status === 'fulfilled' ? result.value : []
  ));

  if (posts.length === 0) {
    throw new ModuleDataError('No posts could be loaded from the configured feeds.');
  }

  return {
    kind: 'posts',
    provider: 'RSS',
    posts: sortPosts(posts).slice(0, limit),
  };
}

async function fetchReddit(module: ModuleBranch): Promise<ModuleData> {
  const subreddit = configString(module, 'subreddit', 'selfhosted').replace(/^r\//i, '');
  const sort = ['hot', 'new', 'top'].includes(configString(module, 'sort', 'hot'))
    ? configString(module, 'sort', 'hot')
    : 'hot';
  const limit = clamp(configNumber(module, 'limit', 5), 1, 15);

  if (!/^[A-Za-z0-9_]+$/.test(subreddit)) {
    throw new ModuleDataError('Enter a valid subreddit name.', 400);
  }

  const url = new URL(`https://www.reddit.com/r/${subreddit}/${sort}/.rss`);
  url.searchParams.set('limit', String(Math.max(limit, 10)));
  if (sort === 'top') url.searchParams.set('t', 'day');

  const body = await fetchText(
    url,
    { headers: { Accept: 'application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8' } },
    'Reddit feed',
  );
  const posts = parseFeed(body, url, `r/${subreddit}`).slice(0, limit);

  return {
    kind: 'posts',
    provider: 'Reddit',
    posts,
  };
}

async function fetchHackerNews(module: ModuleBranch): Promise<ModuleData> {
  const feed = configString(module, 'feed', 'top');
  const endpoint = hackerNewsEndpoint(feed);
  const limit = clamp(configNumber(module, 'limit', 5), 1, 15);
  const ids = arrayValue(await fetchJson(
    new URL(`https://hacker-news.firebaseio.com/v0/${endpoint}.json`),
    {},
    'Hacker News',
  )).slice(0, limit * 2);

  const items = await Promise.all(ids.map((id) => fetchJson(
    new URL(`https://hacker-news.firebaseio.com/v0/item/${id}.json`),
    {},
    'Hacker News',
  )));
  const posts = items.flatMap((item): PostItem[] => {
    const story = asObject(item);
    const id = finiteNumber(valueOf(story, 'id'));
    const title = stringValue(valueOf(story, 'title'));
    if (id === null || !title || valueOf(story, 'dead', 'deleted')) return [];

    const score = finiteNumber(valueOf(story, 'score')) ?? 0;
    const comments = finiteNumber(valueOf(story, 'descendants')) ?? 0;
    const storyUrl = safeHttpUrl(stringValue(valueOf(story, 'url')))
      || `https://news.ycombinator.com/item?id=${id}`;

    return [{
      id: String(id),
      title,
      url: storyUrl,
      source: 'HN',
      publishedAt: unixDate(valueOf(story, 'time')),
      meta: `${score} pts · ${comments} comments`,
    }];
  }).slice(0, limit);

  return {
    kind: 'posts',
    provider: 'Hacker News',
    posts,
  };
}

function parseFeed(body: string, feedUrl: URL, sourceOverride?: string): PostItem[] {
  let parsed: JsonObject;
  try {
    parsed = asObject(xmlParser.parse(body));
  } catch {
    throw new ModuleDataError('The feed returned invalid XML.');
  }

  const rssChannel = asObject(valueOf(asObject(valueOf(parsed, 'rss')), 'channel'));
  const atomFeed = asObject(valueOf(parsed, 'feed'));
  const rdfFeed = asObject(valueOf(parsed, 'RDF'));
  const container = Object.keys(rssChannel).length > 0
    ? rssChannel
    : Object.keys(atomFeed).length > 0
      ? atomFeed
      : rdfFeed;
  const rawItems = arrayValue(valueOf(container, 'item', 'entry'));
  const source = sourceOverride
    || textValue(valueOf(container, 'title'))
    || feedUrl.hostname;

  return rawItems.flatMap((raw, index): PostItem[] => {
    const item = asObject(raw);
    const title = textValue(valueOf(item, 'title'));
    const link = resolveFeedLink(valueOf(item, 'link'), feedUrl);
    if (!title || !link) return [];

    const publishedAt = dateString(valueOf(item, 'pubDate', 'published', 'updated', 'date'));
    const author = textValue(valueOf(item, 'author', 'creator'));
    const id = textValue(valueOf(item, 'guid', 'id')) || `${link}-${index}`;

    return [{
      id,
      title,
      url: link,
      source,
      publishedAt,
      meta: author || undefined,
    }];
  });
}

function sortPosts(posts: PostItem[]) {
  return [...posts].sort((a, b) => (
    Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || '')
  ));
}

function hackerNewsEndpoint(feed: string) {
  switch (feed) {
    case 'new':
      return 'newstories';
    case 'best':
      return 'beststories';
    case 'ask':
      return 'askstories';
    case 'show':
      return 'showstories';
    case 'jobs':
      return 'jobstories';
    case 'top':
    default:
      return 'topstories';
  }
}

function parseWeatherLocation(
  rawLocation: string,
  configuredCountryCode: string,
  configuredRegion: string,
): WeatherLocationQuery {
  const raw = rawLocation.trim();
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  const name = parts[0] || raw;
  let countryCode = normalizeCountryCode(configuredCountryCode);
  let region = configuredRegion.trim();

  for (const part of parts.slice(1)) {
    const normalizedPart = normalizeSearchText(part);
    const stateFromAbbreviation = US_STATE_ABBREVIATIONS[part.toUpperCase()];
    const stateFromName = US_STATE_NAMES[normalizedPart];
    const countryFromName = COUNTRY_ALIASES[normalizedPart];

    if (stateFromAbbreviation || stateFromName) {
      region = stateFromAbbreviation || stateFromName;
      countryCode ||= 'US';
      continue;
    }

    if (countryFromName) {
      countryCode = countryFromName;
      continue;
    }

    const partCountryCode = normalizeCountryCode(part);
    if (partCountryCode) {
      countryCode = partCountryCode;
      continue;
    }

    region ||= part;
  }

  return {
    raw,
    name,
    countryCode,
    region,
  };
}

function selectWeatherPlace(results: JsonObject[], query: WeatherLocationQuery) {
  let bestPlace: JsonObject = {};
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const place of results) {
    const score = weatherPlaceScore(place, query);
    if (score > bestScore) {
      bestScore = score;
      bestPlace = place;
    }
  }

  return bestPlace;
}

function weatherPlaceScore(place: JsonObject, query: WeatherLocationQuery) {
  const placeName = normalizeSearchText(stringValue(valueOf(place, 'name')));
  const queryName = normalizeSearchText(query.name);
  const countryCode = stringValue(valueOf(place, 'country_code')).toUpperCase();
  const admin1 = stringValue(valueOf(place, 'admin1'));
  const normalizedAdmin1 = normalizeSearchText(admin1);
  const queryRegion = normalizeSearchText(query.region);
  const population = finiteNumber(valueOf(place, 'population')) ?? 0;
  const featureCode = stringValue(valueOf(place, 'feature_code'));
  let score = 0;

  if (placeName === queryName) score += 100;
  else if (placeName.startsWith(queryName) || queryName.startsWith(placeName)) score += 45;
  else if (placeName.includes(queryName) || queryName.includes(placeName)) score += 20;

  if (query.countryCode && countryCode === query.countryCode) score += 80;
  if (queryRegion && normalizedAdmin1 === queryRegion) score += 80;
  else if (queryRegion && (normalizedAdmin1.includes(queryRegion) || queryRegion.includes(normalizedAdmin1))) {
    score += 45;
  }

  if (featureCode.startsWith('PPL')) score += 15;
  if (population > 0) score += Math.min(35, Math.log10(population) * 7);

  return score;
}

async function resolvePlexTarget(baseUrl: URL, token: string) {
  if (!isPlexWebUrl(baseUrl)) {
    return { baseUrl, token, detail: undefined as string | undefined };
  }

  const resourcesUrl = new URL('https://plex.tv/api/v2/resources');
  resourcesUrl.searchParams.set('includeHttps', '1');
  resourcesUrl.searchParams.set('includeRelay', '1');

  const resources = arrayValue(await fetchJson(
    resourcesUrl,
    { headers: plexHeaders(token) },
    'Plex account',
  )).map(asObject);

  const candidates = resources.flatMap((resource) => {
    const provides = stringValue(valueOf(resource, 'provides')).toLowerCase();
    const product = stringValue(valueOf(resource, 'product')).toLowerCase();
    if (!provides.split(',').map((part) => part.trim()).includes('server') && product !== 'plex media server') {
      return [];
    }

    const resourceToken = stringValue(valueOf(resource, 'accessToken')) || token;
    const serverName = stringValue(valueOf(resource, 'name')) || 'Plex Media Server';

    return arrayValue(valueOf(resource, 'connections')).flatMap((connection) => {
      const connectionObject = asObject(connection);
      const uri = safeHttpUrl(stringValue(valueOf(connectionObject, 'uri')));
      if (!uri) return [];

      let url: URL;
      try {
        url = new URL(uri);
      } catch {
        return [];
      }

      const protocol = stringValue(valueOf(connectionObject, 'protocol'));
      const isLocal = Boolean(valueOf(connectionObject, 'local'));
      const isRelay = Boolean(valueOf(connectionObject, 'relay'));
      const score = (protocol === 'https' ? 30 : 0)
        + (!isRelay ? 20 : 0)
        + (!isLocal ? 10 : 0);

      return [{
        baseUrl: url,
        token: resourceToken,
        detail: serverName,
        score,
      }];
    });
  }).sort((a, b) => b.score - a.score);

  const target = candidates[0];
  if (!target) {
    throw new ModuleDataError(
      'No Plex Media Server was found for this Plex token. Use your server URL such as http://server-ip:32400, or use a Plex account token that can see your server.',
      400,
    );
  }

  return {
    baseUrl: target.baseUrl,
    token: target.token,
    detail: target.detail,
  };
}

function isPlexWebUrl(url: URL) {
  return ['app.plex.tv', 'plex.tv', 'www.plex.tv'].includes(url.hostname.toLowerCase());
}

function plexHeaders(token: string): Record<string, string> {
  return {
    Accept: 'application/json',
    'X-Plex-Client-Identifier': 'opaque-dashboard',
    'X-Plex-Product': 'OPAQUE',
    'X-Plex-Version': '0.1',
    'X-Plex-Token': token,
  };
}

function jellyfinLikeHeaders(moduleType: string, apiKey: string): Record<string, string> {
  return moduleType === 'emby'
    ? { Accept: 'application/json', 'X-Emby-Token': apiKey }
    : {
        Accept: 'application/json',
        Authorization: `MediaBrowser Token="${apiKey.replace(/["\\]/g, '')}"`,
      };
}

function normalizeCountryCode(value: string) {
  const trimmed = value.trim();
  return /^[A-Za-z]{2}$/.test(trimmed) ? trimmed.toUpperCase() : '';
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function mediaContainer(value: unknown) {
  return asObject(valueOf(asObject(value), 'MediaContainer'));
}

function plexRecentItem(moduleId: string, item: JsonObject): MediaRecentItem[] {
  const id = stringValue(valueOf(item, 'ratingKey', 'key', 'guid'));
  const ownTitle = stringValue(valueOf(item, 'title')) || 'Untitled';
  const parentTitle = stringValue(valueOf(item, 'grandparentTitle', 'parentTitle'));
  const year = finiteNumber(valueOf(item, 'year'));
  const type = stringValue(valueOf(item, 'type')).toLowerCase();

  let title: string;
  let subtitleParts: string[];
  if ((type === 'episode' || type === 'season') && parentTitle && parentTitle !== ownTitle) {
    // TV: the show is the meaningful headline (an episode carries it in
    // grandparentTitle, a season in parentTitle); the episode/season is detail.
    title = parentTitle;
    subtitleParts = [ownTitle, year ? String(year) : ''];
  } else {
    // Movies, music tracks, etc. keep their own title. For these the parent
    // (artist/album for music) is context, so it stays in the subtitle.
    title = ownTitle;
    subtitleParts = [
      parentTitle && parentTitle !== ownTitle ? parentTitle : '',
      year ? String(year) : type,
    ];
  }
  const subtitle = subtitleParts.filter(Boolean).join(' · ') || undefined;
  const imagePath = stringValue(valueOf(item, 'thumb', 'parentThumb', 'grandparentThumb', 'art'));
  // Plex addedAt is a Unix timestamp in seconds.
  const addedAtSeconds = finiteNumber(valueOf(item, 'addedAt'));

  return [{
    id: id || `${title}-${imagePath}`,
    title,
    subtitle,
    imageUrl: imagePath ? mediaImageUrl(moduleId, imagePath) : undefined,
    addedAt: addedAtSeconds ? new Date(addedAtSeconds * 1000).toISOString() : undefined,
  }];
}

function jellyfinLikeRecentItem(moduleId: string, item: JsonObject): MediaRecentItem[] {
  const id = stringValue(valueOf(item, 'Id', 'id'));
  const title = stringValue(valueOf(item, 'Name', 'name')) || 'Untitled';
  const seriesName = stringValue(valueOf(item, 'SeriesName', 'seriesName'));
  const type = stringValue(valueOf(item, 'Type', 'type'));
  const year = finiteNumber(valueOf(item, 'ProductionYear', 'productionYear'));
  const imageTags = asObject(valueOf(item, 'ImageTags', 'imageTags'));
  const hasPrimaryImage = Boolean(
    stringValue(valueOf(imageTags, 'Primary', 'primary'))
      || stringValue(valueOf(item, 'PrimaryImageTag', 'primaryImageTag')),
  );
  const dateCreated = stringValue(valueOf(item, 'DateCreated', 'dateCreated'));

  return [{
    id: id || title,
    title,
    subtitle: [seriesName, year ? String(year) : type].filter(Boolean).join(' · ') || undefined,
    imageUrl: id && hasPrimaryImage
      ? mediaImageUrl(moduleId, `Items/${encodeURIComponent(id)}/Images/Primary?maxWidth=240&quality=80`)
      : undefined,
    addedAt: isoOrUndefined(dateCreated),
  }];
}

function arrRecentItem(moduleId: string, item: JsonObject): MediaRecentItem[] {
  const id = stringValue(valueOf(item, 'id', 'tmdbId', 'tvdbId'));
  const title = stringValue(valueOf(item, 'title')) || 'Untitled';
  const year = finiteNumber(valueOf(item, 'year'));
  const images = arrayValue(valueOf(item, 'images')).map(asObject);
  const poster = images.find((image) => stringValue(valueOf(image, 'coverType')).toLowerCase() === 'poster')
    || images[0]
    || {};
  const rawImageUrl = stringValue(valueOf(poster, 'url', 'remoteUrl'));
  const added = stringValue(valueOf(item, 'added'));

  return [{
    id: id || title,
    title,
    subtitle: year ? String(year) : undefined,
    imageUrl: mediaCoverImageUrl(moduleId, rawImageUrl),
    addedAt: isoOrUndefined(added),
  }];
}

function isoOrUndefined(value: string): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

function mediaCoverImageUrl(moduleId: string, rawImageUrl: string) {
  const directUrl = safeHttpUrl(rawImageUrl);
  if (directUrl) return directUrl;
  return rawImageUrl ? mediaImageUrl(moduleId, rawImageUrl) : undefined;
}

function mediaImageUrl(moduleId: string, path: string) {
  const params = new URLSearchParams({
    moduleId,
    path,
  });
  return `/api/modules/image?${params.toString()}`;
}

async function fetchPlexLibraries(
  baseUrl: URL,
  headers: Record<string, string>,
  sections: JsonObject[],
) {
  const libraries = await Promise.allSettled(
    sections.slice(0, 30).map(async (section) => {
      const key = stringValue(valueOf(section, 'key'));
      const title = stringValue(valueOf(section, 'title')) || 'Library';
      const type = stringValue(valueOf(section, 'type')) || undefined;
      if (!key) {
        return {
          id: title,
          name: title,
          count: 0,
          type,
        };
      }

      const payload = await fetchJson(
        serviceEndpoint(
          baseUrl,
          `library/sections/${encodeURIComponent(key)}/all?X-Plex-Container-Start=0&X-Plex-Container-Size=0`,
        ),
        { headers },
        'Plex',
      );
      const container = mediaContainer(payload);
      return {
        id: key,
        name: title,
        count: finiteNumber(valueOf(container, 'totalSize', 'size')) ?? 0,
        type,
      };
    }),
  );

  return libraries.flatMap((result): MediaLibraryStat[] => (
    result.status === 'fulfilled' ? [result.value] : []
  ));
}

async function fetchJellyfinLikeLibraries(
  baseUrl: URL,
  headers: Record<string, string>,
  folders: JsonObject[],
  service: string,
) {
  const libraries = await Promise.allSettled(
    folders.slice(0, 30).map(async (folder) => {
      const id = stringValue(valueOf(folder, 'Id', 'id'));
      const name = stringValue(valueOf(folder, 'Name', 'name')) || 'Library';
      const type = stringValue(valueOf(folder, 'CollectionType', 'collectionType')) || undefined;
      const childCount = finiteNumber(valueOf(folder, 'ChildCount', 'childCount'));
      if (!id) {
        return {
          id: name,
          name,
          count: childCount ?? 0,
          type,
        };
      }

      const countUrl = serviceEndpoint(baseUrl, 'Items');
      countUrl.searchParams.set('ParentId', id);
      countUrl.searchParams.set('Recursive', 'true');
      countUrl.searchParams.set('Limit', '0');
      countUrl.searchParams.set('IncludeItemTypes', 'Movie,Series,Episode,Audio,Book');

      const payload = asObject(await fetchJson(countUrl, { headers }, service));

      return {
        id,
        name,
        count: finiteNumber(valueOf(payload, 'TotalRecordCount', 'totalRecordCount')) ?? childCount ?? 0,
        type,
      };
    }),
  );

  return libraries.flatMap((result): MediaLibraryStat[] => (
    result.status === 'fulfilled' ? [result.value] : []
  ));
}

function activePlexStreams(container: JsonObject) {
  const metadataCount = arrayValue(valueOf(container, 'Metadata')).length;
  if (metadataCount > 0) return metadataCount;

  return [
    ...arrayValue(valueOf(container, 'Video')),
    ...arrayValue(valueOf(container, 'Track')),
    ...arrayValue(valueOf(container, 'Photo')),
  ].length;
}

function plexNowPlaying(moduleId: string, container: JsonObject): MediaNowPlayingItem[] {
  const sessions = [
    ...arrayValue(valueOf(container, 'Metadata')),
    ...arrayValue(valueOf(container, 'Video')),
    ...arrayValue(valueOf(container, 'Track')),
  ].map(asObject);

  return sessions.slice(0, 3).map((item, index) => {
    const ownTitle = stringValue(valueOf(item, 'title')) || 'Untitled';
    const parentTitle = stringValue(valueOf(item, 'grandparentTitle', 'parentTitle'));
    const type = stringValue(valueOf(item, 'type')).toLowerCase();
    // Lead with the show name only for TV; tracks (artist in grandparentTitle)
    // and movies keep their own title with the parent shown as context.
    const promoteParent = (type === 'episode' || type === 'season')
      && Boolean(parentTitle) && parentTitle !== ownTitle;
    const title = promoteParent ? parentTitle : ownTitle;
    const subtitle = promoteParent
      ? ownTitle
      : (parentTitle && parentTitle !== ownTitle ? parentTitle : undefined);
    const user = stringValue(valueOf(asObject(valueOf(item, 'User')), 'title'));
    const device = stringValue(valueOf(asObject(valueOf(item, 'Player')), 'title', 'product'));
    const state = stringValue(valueOf(asObject(valueOf(item, 'Player')), 'state'));
    const offset = finiteNumber(valueOf(item, 'viewOffset'));
    const duration = finiteNumber(valueOf(item, 'duration'));
    const imagePath = stringValue(valueOf(item, 'thumb', 'parentThumb', 'grandparentThumb', 'art'));

    return {
      id: stringValue(valueOf(item, 'sessionKey', 'ratingKey')) || `np-${index}`,
      title,
      subtitle,
      user: user || undefined,
      device: device || undefined,
      paused: state === 'paused',
      progress: offset && duration ? clampUnit(offset / duration) : undefined,
      imageUrl: imagePath ? mediaImageUrl(moduleId, imagePath) : undefined,
    };
  });
}

function jellyfinLikeNowPlaying(moduleId: string, sessions: unknown[]): MediaNowPlayingItem[] {
  return sessions
    .map(asObject)
    .filter((session) => Boolean(valueOf(session, 'NowPlayingItem', 'nowPlayingItem')))
    .slice(0, 3)
    .map((session, index) => {
      const np = asObject(valueOf(session, 'NowPlayingItem', 'nowPlayingItem'));
      const ownTitle = stringValue(valueOf(np, 'Name', 'name')) || 'Untitled';
      const seriesName = stringValue(valueOf(np, 'SeriesName', 'seriesName'));
      const title = seriesName || ownTitle;
      const subtitle = seriesName ? ownTitle : undefined;
      const user = stringValue(valueOf(session, 'UserName', 'userName'));
      const device = stringValue(valueOf(session, 'DeviceName', 'deviceName', 'Client', 'client'));
      const playState = asObject(valueOf(session, 'PlayState', 'playState'));
      const paused = valueOf(playState, 'IsPaused', 'isPaused') === true;
      const positionTicks = finiteNumber(valueOf(playState, 'PositionTicks', 'positionTicks'));
      const runtimeTicks = finiteNumber(valueOf(np, 'RunTimeTicks', 'runTimeTicks'));
      const npId = stringValue(valueOf(np, 'Id', 'id'));
      const hasPrimary = Boolean(stringValue(valueOf(asObject(valueOf(np, 'ImageTags', 'imageTags')), 'Primary', 'primary')));

      return {
        id: stringValue(valueOf(session, 'Id', 'id')) || `np-${index}`,
        title,
        subtitle,
        user: user || undefined,
        device: device || undefined,
        paused,
        progress: positionTicks && runtimeTicks ? clampUnit(positionTicks / runtimeTicks) : undefined,
        imageUrl: npId && hasPrimary
          ? mediaImageUrl(moduleId, `Items/${encodeURIComponent(npId)}/Images/Primary?maxWidth=240&quality=80`)
          : undefined,
      };
    });
}

function arrQueueItems(records: unknown[], isSonarr: boolean): MediaQueueItem[] {
  return records.map(asObject).slice(0, 4).map((record, index) => {
    const title = isSonarr
      ? stringValue(valueOf(asObject(valueOf(record, 'series')), 'title')) || stringValue(valueOf(record, 'title'))
      : stringValue(valueOf(asObject(valueOf(record, 'movie')), 'title')) || stringValue(valueOf(record, 'title'));
    const episode = isSonarr ? asObject(valueOf(record, 'episode')) : null;
    const seasonNum = episode ? finiteNumber(valueOf(episode, 'seasonNumber')) : null;
    const epNum = episode ? finiteNumber(valueOf(episode, 'episodeNumber')) : null;
    const size = finiteNumber(valueOf(record, 'size'));
    const sizeLeft = finiteNumber(valueOf(record, 'sizeleft', 'sizeLeft'));
    const progress = size !== null && size > 0 && sizeLeft !== null
      ? clampUnit((size - sizeLeft) / size)
      : undefined;
    const status = stringValue(valueOf(record, 'status')).toLowerCase() || undefined;

    return {
      id: stringValue(valueOf(record, 'id', 'downloadId')) || `q-${index}`,
      title: title || 'Untitled',
      subtitle: seasonNum && epNum
        ? `S${String(seasonNum).padStart(2, '0')}E${String(epNum).padStart(2, '0')}`
        : undefined,
      progress,
      status,
    };
  });
}

function clampUnit(value: number) {
  if (!Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(1, value));
}

function latestAddedAt(items: MediaRecentItem[]): string | undefined {
  const times = items
    .map((item) => (item.addedAt ? Date.parse(item.addedAt) : NaN))
    .filter((ms) => !Number.isNaN(ms));
  if (times.length === 0) return undefined;
  return new Date(Math.max(...times)).toISOString();
}

function mediaItemCount(counts: JsonObject) {
  return [
    'MovieCount',
    'SeriesCount',
    'EpisodeCount',
    'SongCount',
    'BookCount',
  ].reduce((total, key) => total + (finiteNumber(valueOf(counts, key)) ?? 0), 0);
}

function defaultMarketSymbols() {
  return ['SPY', 'BTC-USD', 'NVDA', 'AAPL', 'MSFT'];
}

function marketSparkline(closes: number[], price: number, previousClose: number) {
  const values = closes.filter((value) => Number.isFinite(value));
  if (Number.isFinite(price) && values.at(-1) !== price) values.push(price);
  if (values.length >= 2) return values.slice(-30);
  if (Number.isFinite(previousClose) && Number.isFinite(price)) return [previousClose, price];
  return values;
}

function marketDisplayName(symbol: string, meta: JsonObject) {
  const normalizedSymbol = (stringValue(valueOf(meta, 'symbol')) || symbol).toUpperCase();
  const knownNames: Record<string, string> = {
    SPY: 'S&P 500',
    'BTC-USD': 'Bitcoin',
    NVDA: 'NVIDIA',
    AAPL: 'Apple',
    MSFT: 'Microsoft',
  };

  return knownNames[normalizedSymbol]
    || stringValue(valueOf(meta, 'shortName', 'longName', 'instrumentType', 'exchangeName'))
    || normalizedSymbol;
}

function formatWeatherLocation(place: JsonObject, fallback: string) {
  const parts = [
    stringValue(valueOf(place, 'name')),
    stringValue(valueOf(place, 'admin1')),
  ].filter(Boolean);
  return parts.length > 0 ? [...new Set(parts)].join(', ') : fallback;
}

function weatherCodeLabel(code: number | null) {
  if (code === null) return 'Unknown';
  if (code === 0) return 'Clear sky';
  if ([1, 2].includes(code)) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Mixed conditions';
}

function configString(module: ModuleBranch, key: string, fallback = '') {
  const value = module.config?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function optionalConfigString(module: ModuleBranch, key: string) {
  const value = module.config?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function hasConfigKey(module: ModuleBranch, key: string) {
  return Boolean(module.config && Object.prototype.hasOwnProperty.call(module.config, key));
}

function configNumber(module: ModuleBranch, key: string, fallback: number) {
  return finiteNumber(module.config?.[key]) ?? fallback;
}

function configList(module: ModuleBranch, key: string, fallback: string[]) {
  const value = module.config?.[key];
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\n,]+/)
      : fallback;

  return values
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function requiredHttpUrl(value: string, message: string) {
  if (!value) throw new ModuleDataError(message, 400);

  const normalized = value.startsWith('webcal://')
    ? `https://${value.slice('webcal://'.length)}`
    : value;

  try {
    const url = new URL(normalized);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
    return url;
  } catch {
    throw new ModuleDataError(message, 400);
  }
}

function safeHttpUrl(value: string | undefined) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function serviceEndpoint(baseUrl: URL, endpoint: string) {
  const base = cleanBaseUrl(baseUrl);
  return new URL(endpoint.replace(/^\/+/, ''), `${base}/`);
}

function cleanBaseUrl(url: URL) {
  return url.toString().replace(/\/+$/, '');
}

async function fetchJson(
  url: URL,
  init: RequestInit,
  label: string,
): Promise<unknown> {
  const response = await fetchRemote(url, init, label);
  try {
    return await response.json();
  } catch {
    throw new ModuleDataError(`${label} returned an invalid JSON response.`);
  }
}

async function fetchText(
  url: URL,
  init: RequestInit,
  label: string,
) {
  const response = await fetchRemote(url, init, label);
  const contentLength = finiteNumber(response.headers.get('content-length'));
  if (contentLength !== null && contentLength > MAX_TEXT_RESPONSE_LENGTH) {
    throw new ModuleDataError(`${label} response is too large.`);
  }

  const text = await response.text();
  if (text.length > MAX_TEXT_RESPONSE_LENGTH) {
    throw new ModuleDataError(`${label} response is too large.`);
  }
  return text;
}

async function fetchImage(
  url: URL,
  init: RequestInit,
  label: string,
) {
  const response = await fetchRemote(url, init, label);
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new ModuleDataError(`${label} returned a non-image response.`);
  }

  const contentLength = finiteNumber(response.headers.get('content-length'));
  if (contentLength !== null && contentLength > MAX_IMAGE_RESPONSE_LENGTH) {
    throw new ModuleDataError(`${label} response is too large.`);
  }

  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_IMAGE_RESPONSE_LENGTH) {
    throw new ModuleDataError(`${label} response is too large.`);
  }

  return {
    body,
    contentType,
  };
}

async function fetchRemote(url: URL, init: RequestInit, label: string) {
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (!headers.has('User-Agent')) headers.set('User-Agent', USER_AGENT);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ModuleDataError(`Unable to reach ${label}.`);
  }

  if (!response.ok) {
    const statusHint = response.status === 401 || response.status === 403
      ? ' Check the configured credentials.'
      : '';
    throw new ModuleDataError(`${label} returned HTTP ${response.status}.${statusHint}`);
  }

  return response;
}

function mediaImageEndpoint(value: string) {
  const endpoint = value.trim();
  if (
    !endpoint
    || endpoint.startsWith('//')
    || /^[a-z][a-z0-9+.-]*:/i.test(endpoint)
    || endpoint.includes('\\')
  ) {
    throw new ModuleDataError('Invalid media image path.', 400);
  }

  const [pathPart] = endpoint.split('?');
  if (pathPart.split('/').some((part) => part === '..')) {
    throw new ModuleDataError('Invalid media image path.', 400);
  }

  return endpoint.replace(/^\/+/, '');
}

function resolveFeedLink(value: unknown, baseUrl: URL) {
  const candidates = arrayValue(value);
  for (const candidate of candidates) {
    const object = asObject(candidate);
    const rel = stringValue(valueOf(object, '@_rel'));
    const raw = typeof candidate === 'string'
      ? candidate
      : stringValue(valueOf(object, '@_href', '#text'));
    if (!raw || rel === 'self') continue;

    try {
      const url = new URL(raw, baseUrl);
      if (['http:', 'https:'].includes(url.protocol)) return url.toString();
    } catch {
      // Continue to the next candidate.
    }
  }
  return '';
}

function textValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  const object = asObject(value);
  return stringValue(valueOf(object, '#text', 'name', 'val'));
}

function dateString(value: unknown) {
  const text = textValue(value);
  if (!text || Number.isNaN(Date.parse(text))) return undefined;
  return new Date(text).toISOString();
}

function unixDate(value: unknown) {
  const seconds = finiteNumber(value);
  return seconds === null ? undefined : new Date(seconds * 1000).toISOString();
}

function requiredNumber(value: unknown, message: string) {
  const number = finiteNumber(value);
  if (number === null) throw new ModuleDataError(message);
  return number;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function arrayValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

function valueOf(object: JsonObject, ...keys: string[]) {
  for (const key of keys) {
    if (key in object) return object[key];
    const match = Object.keys(object).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    if (match) return object[match];
  }
  return undefined;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
