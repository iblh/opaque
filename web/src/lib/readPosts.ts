// Read-state for post links, kept in localStorage so it survives visits
// without touching the server. Keyed by URL — feed item ids can change
// between fetches, urls don't.

const STORAGE_KEY = 'opaque:read-posts';
const MAX_ENTRIES = 1000;

let cache: Set<string> | null = null;
const listeners = new Set<() => void>();
let storageListenerAttached = false;

function load(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((entry): entry is string => typeof entry === 'string'));
  } catch {
    return new Set();
  }
}

function persist(entries: Set<string>) {
  try {
    // Oldest first in insertion order; keep the most recent MAX_ENTRIES.
    const list = Array.from(entries).slice(-MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable (private mode / quota): read-state stays in-memory.
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function readSet(): Set<string> {
  if (!cache) cache = load();
  return cache;
}

export function isPostRead(url: string): boolean {
  return readSet().has(url);
}

export function markPostRead(url: string) {
  if (!url) return;
  const set = readSet();
  if (set.has(url)) return;
  set.add(url);
  if (set.size > MAX_ENTRIES) {
    cache = new Set(Array.from(set).slice(-MAX_ENTRIES));
  }
  persist(readSet());
  notify();
}

/** Re-renders subscribers when read-state changes here or in another tab. */
export function subscribeReadPosts(listener: () => void): () => void {
  listeners.add(listener);
  if (!storageListenerAttached && typeof window !== 'undefined') {
    storageListenerAttached = true;
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) return;
      cache = null;
      notify();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}
