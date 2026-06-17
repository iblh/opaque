import { useCallback, useEffect, useRef, useState } from 'react';
import { Dashboard, ServerBranch } from '@/lib/types';

export interface AppNotification {
  id: string;
  /** Tone drives the status dot color; stays within the muted palette. */
  tone: 'positive' | 'negative' | 'neutral';
  title: string;
  detail?: string;
  /** Epoch ms when the event was observed (client clock). */
  at: number;
}

// Persist only the "last seen" timestamp (a number) — never notification text,
// which can include user-named servers. Unread = created after lastSeen.
const LAST_SEEN_KEY = 'opaque:notifications-last-seen';
const MAX_NOTIFICATIONS = 50;
const SERVER_STALE_MS = 30 * 1000;

type ServerState = 'online' | 'offline';

function serverState(server: ServerBranch): ServerState {
  const updatedAt = server.stats?.updatedAt
    ? new Date(server.stats.updatedAt).getTime()
    : Number.NaN;
  const fresh = Number.isFinite(updatedAt) && Date.now() - updatedAt <= SERVER_STALE_MS;
  return server.stats?.status === 'online' && fresh ? 'online' : 'offline';
}

function serverBranches(dashboard: Dashboard | null): ServerBranch[] {
  const branches = dashboard?.forest.find((tree) => tree.root === 'servers')?.branches;
  return Array.isArray(branches) ? (branches as ServerBranch[]) : [];
}

function readLastSeen(): number {
  try {
    const raw = window.localStorage.getItem(LAST_SEEN_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

// Observes dashboard server statuses and emits a notification on each
// online↔offline transition. Derived entirely client-side from data already on
// screen — no new backend. The first observation seeds a baseline silently so a
// reload doesn't replay every server's current state as an "event".
export function useNotifications(dashboard: Dashboard | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [lastSeen, setLastSeen] = useState(0);
  const prevStatesRef = useRef<Map<string, ServerState> | null>(null);

  useEffect(() => {
    setLastSeen(readLastSeen());
  }, []);

  useEffect(() => {
    if (!dashboard) return;
    const servers = serverBranches(dashboard);
    const nextStates = new Map<string, ServerState>();
    servers.forEach((server) => nextStates.set(server.id, serverState(server)));

    const prev = prevStatesRef.current;
    prevStatesRef.current = nextStates;
    // First pass just records the baseline — don't emit for pre-existing state.
    if (prev === null) return;

    const fresh: AppNotification[] = [];
    nextStates.forEach((state, id) => {
      const before = prev.get(id);
      if (before === undefined || before === state) return;
      const server = servers.find((item) => item.id === id);
      const name = server?.name || 'A server';
      if (state === 'offline') {
        fresh.push({
          id: `${id}:offline:${Date.now()}`,
          tone: 'negative',
          title: `${name} went offline`,
          at: Date.now(),
        });
      } else {
        fresh.push({
          id: `${id}:online:${Date.now()}`,
          tone: 'positive',
          title: `${name} is back online`,
          at: Date.now(),
        });
      }
    });

    if (fresh.length > 0) {
      setNotifications((current) => [...fresh, ...current].slice(0, MAX_NOTIFICATIONS));
    }
  }, [dashboard]);

  const markAllRead = useCallback(() => {
    const now = Date.now();
    setLastSeen(now);
    try {
      window.localStorage.setItem(LAST_SEEN_KEY, String(now));
    } catch {
      // Storage unavailable; unread state stays in-memory for this session.
    }
  }, []);

  const unreadCount = notifications.filter((notification) => notification.at > lastSeen).length;

  return { notifications, unreadCount, markAllRead };
}
