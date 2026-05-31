import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  dashboards,
  serverAgentTokens,
  servers,
  users,
} from '@/db/schema';
import {
  createEmptyDashboard,
  normalizeDashboard,
  serializeDashboard,
} from '@/lib/dashboard';
import { Dashboard, ServerBranch, Tree } from '@/lib/types';

export async function getOrCreateDashboardForUser(userId: string) {
  const user = await getUser(userId);
  if (!user) return null;

  const [existing] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.userId, userId))
    .limit(1);

  if (existing) {
    return rowToDashboard(existing, user);
  }

  const dashboard = createEmptyDashboard({
    email: user.email || undefined,
    username: user.username || undefined,
    name: user.name || undefined,
  });

  const [created] = await db
    .insert(dashboards)
    .values({
      userId,
      forest: dashboard.forest,
    })
    .returning();

  return rowToDashboard(created, user);
}

export async function saveDashboardForUser(userId: string, input: Dashboard) {
  const user = await getUser(userId);
  if (!user) return null;

  const identity = {
    email: user.email || undefined,
    username: user.username || undefined,
    name: user.name || undefined,
  };

  const normalized = normalizeDashboard(input, identity);
  const now = new Date();

  const saved = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(dashboards)
      .where(eq(dashboards.userId, userId))
      .limit(1);

    const [dashboardRow] = existing
      ? await tx
          .update(dashboards)
          .set({
            forest: normalized.forest,
            updatedAt: now,
          })
          .where(eq(dashboards.id, existing.id))
          .returning()
      : await tx
          .insert(dashboards)
          .values({
            userId,
            forest: normalized.forest,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

    await syncServerProjection(tx, dashboardRow.id, normalized.forest, now);

    return dashboardRow;
  });

  return rowToDashboard(saved, user);
}

async function syncServerProjection(
  tx: any,
  dashboardId: string,
  forest: Tree[],
  now: Date,
) {
  const incomingServers = extractServers(forest);
  const incomingBranchIds = new Set(incomingServers.map((server) => server.id));

  for (const server of incomingServers) {
    await tx
      .insert(servers)
      .values({
        dashboardId,
        branchId: server.id,
        name: server.name || 'Untitled',
        url: server.url || '',
        icon: server.icon || '',
        updatedAt: now,
        deletedAt: null,
      })
      .onConflictDoUpdate({
        target: [servers.dashboardId, servers.branchId],
        set: {
          name: server.name || 'Untitled',
          url: server.url || '',
          icon: server.icon || '',
          updatedAt: now,
          deletedAt: null,
        },
      });
  }

  const existingServers = await tx
    .select({
      id: servers.id,
      branchId: servers.branchId,
    })
    .from(servers)
    .where(and(eq(servers.dashboardId, dashboardId), isNull(servers.deletedAt)));

  const removed = existingServers.filter(
    (server: { branchId: string }) => !incomingBranchIds.has(server.branchId),
  );

  if (removed.length === 0) return;

  const removedBranchIds = removed.map((server: { branchId: string }) => server.branchId);
  const removedServerIds = removed.map((server: { id: string }) => server.id);

  await tx
    .update(servers)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(and(eq(servers.dashboardId, dashboardId), inArray(servers.branchId, removedBranchIds)));

  await tx
    .update(serverAgentTokens)
    .set({
      revokedAt: now,
    })
    .where(inArray(serverAgentTokens.serverId, removedServerIds));
}

function extractServers(forest: Tree[]) {
  return (
    (forest.find((tree) => tree.root === 'servers')?.branches || []) as ServerBranch[]
  ).filter((server) => Boolean(server.id));
}

async function getUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user || null;
}

function rowToDashboard(
  row: typeof dashboards.$inferSelect,
  user: typeof users.$inferSelect,
) {
  return serializeDashboard(
    normalizeDashboard(
      {
        id: row.id,
        forest: row.forest,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      {
        email: user.email || undefined,
        username: user.username || undefined,
        name: user.name || undefined,
      },
    ),
  );
}
