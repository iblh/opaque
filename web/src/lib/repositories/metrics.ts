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

const MAX_UPTIME_LENGTH = 120;

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
  const source = isPlainObject(input) ? input : {};
  const memory = isPlainObject(source.memory) ? source.memory : {};
  const disk = isPlainObject(source.disk) ? source.disk : {};
  const network = isPlainObject(source.network) ? source.network : {};

  return {
    status: source.status === 'offline' ? 'offline' : 'online',
    uptime: normalizeText(source.uptime),
    cores: positiveIntegerOrUndefined(source.cores),
    load: Array.isArray(source.load)
      ? source.load
          .slice(0, 3)
          .map(nonNegativeNumberOrUndefined)
          .filter((value): value is number => value !== undefined)
      : undefined,
    cpu: clampPercent(isPlainObject(source.cpu) ? source.cpu.percent : source.cpu ?? source.cpuPercent),
    memory: {
      used: nonNegativeNumber(memory.used ?? source.memoryUsed),
      total: nonNegativeNumber(memory.total ?? source.memoryTotal),
    },
    disk: {
      used: nonNegativeNumber(disk.used ?? source.diskUsed),
      total: nonNegativeNumber(disk.total ?? source.diskTotal),
    },
    network: {
      in: nonNegativeNumber(network.in ?? source.networkIn),
      out: nonNegativeNumber(network.out ?? source.networkOut),
    },
    temperature: nonNegativeNumber(source.temperature),
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

function nonNegativeNumberOrUndefined(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return undefined;
  return number;
}

function positiveIntegerOrUndefined(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return undefined;
  return Math.floor(number);
}

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).slice(0, MAX_UPTIME_LENGTH);
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
