import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '@/db/client';
import { dashboards, users } from '@/db/schema';
import { createEmptyDashboard } from '@/lib/dashboard';

export type AppUser = typeof users.$inferSelect;

export async function findUserByLogin(login: string) {
  const normalized = normalizeLogin(login);
  if (!normalized) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, normalized), eq(users.username, normalized)))
    .limit(1);

  return user || null;
}

export async function findUserById(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user || null;
}

export async function createCredentialsUser({
  identifier,
  password,
  name,
}: {
  identifier: string;
  password: string;
  name?: string;
}) {
  const login = normalizeLogin(identifier);
  if (!login) {
    return { error: 'email or username and password are required' as const };
  }

  if (!password) {
    return { error: 'email or username and password are required' as const };
  }

  if (password.length < 6) {
    return { error: 'password must be at least 6 characters' as const };
  }

  const existing = await findUserByLogin(login);
  if (existing) {
    return { error: 'account already exists' as const };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const isEmail = login.includes('@');
  const displayName = (name || login).trim();

  const [user] = await db
    .insert(users)
    .values({
      email: isEmail ? login : null,
      username: isEmail ? null : login,
      name: displayName,
      passwordHash,
    })
    .returning();

  await ensureDashboardForUser(user.id);

  return { user };
}

export async function ensureDashboardForUser(userId: string) {
  const user = await findUserById(userId);
  if (!user) return null;

  const [existing] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.userId, userId))
    .limit(1);

  if (existing) return existing;

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

  return created;
}

export const MAX_DISPLAY_NAME_LENGTH = 60;

// Update the authenticated user's display name only. Email/username are not
// editable here. Returns the updated user, or an error for invalid input.
export async function updateUserName(userId: string, name: string) {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    return { error: 'display name is required' as const };
  }
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return { error: `display name must be at most ${MAX_DISPLAY_NAME_LENGTH} characters` as const };
  }

  const [user] = await db
    .update(users)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  if (!user) return { error: 'user not found' as const };
  return { user };
}

export function normalizeLogin(login: string) {
  return String(login || '').trim().toLowerCase();
}

export function userDisplayName(user: Pick<AppUser, 'name' | 'username' | 'email'>) {
  return user.name || user.username || user.email || 'User';
}
