import { and, eq, isNull } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { db } from '@/db/client';
import {
  dashboards,
  serverAgentTokens,
  servers,
} from '@/db/schema';

export async function rotateServerAgentToken({
  userId,
  branchId,
  label,
}: {
  userId: string;
  branchId: string;
  label?: string;
}) {
  const [server] = await db
    .select({
      id: servers.id,
      branchId: servers.branchId,
      name: servers.name,
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

  const now = new Date();
  const tokenId = randomUUID().replace(/-/g, '').slice(0, 20);
  const secret = randomBytes(32).toString('base64url');
  const token = `opaque_srv_${tokenId}_${secret}`;
  const tokenHash = await bcrypt.hash(secret, 10);

  const created = await db.transaction(async (tx) => {
    await tx
      .update(serverAgentTokens)
      .set({ revokedAt: now })
      .where(
        and(
          eq(serverAgentTokens.serverId, server.id),
          isNull(serverAgentTokens.revokedAt),
        ),
      );

    const [row] = await tx
      .insert(serverAgentTokens)
      .values({
        serverId: server.id,
        tokenId,
        tokenHash,
        label: label || 'Default agent',
        createdAt: now,
      })
      .returning({
        id: serverAgentTokens.id,
        tokenId: serverAgentTokens.tokenId,
        createdAt: serverAgentTokens.createdAt,
      });

    return row;
  });

  return {
    serverId: server.branchId,
    serverName: server.name,
    token,
    tokenId: created.tokenId,
    createdAt: created.createdAt.toISOString(),
  };
}
