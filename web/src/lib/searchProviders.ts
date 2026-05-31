export type SearchProviderId = 'google' | 'duckduckgo' | 'chatgpt';

export type SearchProvider = {
  id: SearchProviderId;
  label: string;
  placeholder: string;
  url: string;
};

export const DEFAULT_SEARCH_PROVIDER_ID: SearchProviderId = 'google';

export const SEARCH_PROVIDERS: SearchProvider[] = [
  {
    id: 'google',
    label: 'Google',
    placeholder: 'Search Google',
    url: 'https://www.google.com/search?q={query}',
  },
  {
    id: 'duckduckgo',
    label: 'DuckDuckGo',
    placeholder: 'Search DuckDuckGo',
    url: 'https://duckduckgo.com/?q={query}',
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    placeholder: 'Ask ChatGPT',
    url: 'https://chatgpt.com/?hints=search&q={query}',
  },
];

export function getSearchProvider(providerId: string | null | undefined) {
  return SEARCH_PROVIDERS.find((provider) => provider.id === providerId)
    || SEARCH_PROVIDERS.find((provider) => provider.id === DEFAULT_SEARCH_PROVIDER_ID)
    || SEARCH_PROVIDERS[0];
}

export function buildSearchUrl(providerId: string, query: string) {
  const provider = getSearchProvider(providerId);
  return provider.url.replace('{query}', encodeURIComponent(query.trim()));
}
