import { and, desc, eq, gte, isNull, lt } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '@/db/client';
import {
  dashboards,
  serverAgentTokens,
  serverMetricLatest,
  serverMetricSamples,
  servers,
} from '@/db/schema';
import { ServerStats } from '@/lib/types';

export async function getLatestMetricsForUser(userId: string) {
  const rows = await db
    .select({
      id: servers.branchId,
      stats: serverMetricLatest.stats,
    })
    .from(dashboards)
    .innerJoin(servers, eq(servers.dashboardId, dashboards.id))
    .leftJoin(serverMetricLatest, eq(serverMetricLatest.serverId, servers.id))
    .where(and(eq(dashboards.userId, userId), isNull(servers.deletedAt)));

  return rows
    .filter((row) => Boolean(row.stats))
    .map((row) => ({
      id: row.id,
      stats: row.stats as ServerStats,
    }));
}

export async function recordMetricsWithAgentToken({
  branchId,
  agentToken,
  input,
}: {
  branchId: string;
  agentToken: string;
  input: unknown;
}) {
  const parsedToken = parseAgentToken(agentToken);
  if (!parsedToken) {
    return { error: 'unauthorized' as const, status: 401 };
  }

  const [row] = await db
    .select({
      token: serverAgentTokens,
      server: servers,
    })
    .from(serverAgentTokens)
    .innerJoin(servers, eq(servers.id, serverAgentTokens.serverId))
    .where(eq(serverAgentTokens.tokenId, parsedToken.tokenId))
    .limit(1);

  if (!row || row.token.revokedAt || row.server.deletedAt || row.server.branchId !== branchId) {
    return { error: 'unauthorized' as const, status: 401 };
  }

  const tokenMatches = await bcrypt.compare(parsedToken.secret, row.token.tokenHash);
  if (!tokenMatches) {
    return { error: 'unauthorized' as const, status: 401 };
  }

  const now = new Date();
  const stats = normalizeStats(input, now);

  await db.transaction(async (tx) => {
    await tx
      .insert(serverMetricLatest)
      .values({
        serverId: row.server.id,
        stats,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: serverMetricLatest.serverId,
        set: {
          stats,
          updatedAt: now,
        },
      });

    await tx.insert(serverMetricSamples).values({
      serverId: row.server.id,
      recordedAt: now,
      status: stats.status,
      uptime: stats.uptime,
      cores: stats.cores,
      load: stats.load,
      cpu: stats.cpu,
      memoryUsed: stats.memory.used,
      memoryTotal: stats.memory.total,
      diskUsed: stats.disk.used,
      diskTotal: stats.disk.total,
      networkIn: stats.network.in,
      networkOut: stats.network.out,
      temperature: stats.temperature,
    });

    await tx
      .update(serverAgentTokens)
      .set({ lastUsedAt: now })
      .where(eq(serverAgentTokens.id, row.token.id));
  });

  return { stats };
}

export async function getMetricHistoryForUser({
  userId,
  branchId,
  range,
}: {
  userId: string;
  branchId: string;
  range: '24h' | '7d';
}) {
  const [server] = await db
    .select({
      id: servers.id,
    })
    .from(dashboards)
    .innerJoin(servers, eq(servers.dashboardId, dashboards.id))
    .where(
      and(
        eq(dashboards.userId, userId),
        eq(servers.branchId, branchId),
        isNull(servers.deletedAt),
      ),
    )
    .limit(1);

  if (!server) return null;

  const since = new Date(Date.now() - (range === '24h' ? 24 : 7 * 24) * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(serverMetricSamples)
    .where(
      and(
        eq(serverMetricSamples.serverId, server.id),
        gte(serverMetricSamples.recordedAt, since),
      ),
    )
    .orderBy(desc(serverMetricSamples.recordedAt))
    .limit(range === '24h' ? 1000 : 3000);

  return rows.reverse().map((row) => ({
    recordedAt: row.recordedAt.toISOString(),
    status: row.status,
    uptime: row.uptime,
    cores: row.cores || undefined,
    load: row.load || undefined,
    cpu: row.cpu,
    memory: {
      used: row.memoryUsed,
      total: row.memoryTotal,
    },
    disk: {
      used: row.diskUsed,
      total: row.diskTotal,
    },
    network: {
      in: row.networkIn,
      out: row.networkOut,
    },
    temperature: row.temperature,
  }));
}

export async function deleteOldMetricSamples(retentionDays: number) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  return db.delete(serverMetricSamples).where(lt(serverMetricSamples.recordedAt, cutoff));
}

export function normalizeStats(input: any, now: Date = new Date()): ServerStats {
  const memory = input.memory || {};
  const disk = input.disk || {};
  const network = input.network || {};

  return {
    status: input.status === 'offline' ? 'offline' : 'online',
    uptime: String(input.uptime || ''),
    cores: numberOrUndefined(input.cores),
    load: Array.isArray(input.load)
      ? input.load.slice(0, 3).map((value: unknown) => Number(value)).filter(Number.isFinite)
      : undefined,
    cpu: clampPercent(input.cpu?.percent ?? input.cpu ?? input.cpuPercent),
    memory: {
      used: nonNegativeNumber(memory.used ?? input.memoryUsed),
      total: nonNegativeNumber(memory.total ?? input.memoryTotal),
    },
    disk: {
      used: nonNegativeNumber(disk.used ?? input.diskUsed),
      total: nonNegativeNumber(disk.total ?? input.diskTotal),
    },
    network: {
      in: nonNegativeNumber(network.in ?? input.networkIn),
      out: nonNegativeNumber(network.out ?? input.networkOut),
    },
    temperature: nonNegativeNumber(input.temperature),
    updatedAt: now.toISOString(),
  };
}

function parseAgentToken(token: string) {
  const match = token.match(/^opaque_srv_([a-f0-9]{20})_([A-Za-z0-9_-]+)$/);
  if (!match) return null;
  return {
    tokenId: match[1],
    secret: match[2],
  };
}

function clampPercent(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

function nonNegativeNumber(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, number);
}

function numberOrUndefined(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
