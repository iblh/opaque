import {
  boolean,
  bigint,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';
import type { ServerStats, Tree } from '../lib/types';

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  username: text('username').unique(),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compositePk: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index('accounts_user_id_idx').on(account.userId),
  }),
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  }),
);

export const authenticators = pgTable(
  'authenticators',
  {
    credentialID: text('credential_id').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerAccountId: text('provider_account_id').notNull(),
    credentialPublicKey: text('credential_public_key').notNull(),
    counter: integer('counter').notNull(),
    credentialDeviceType: text('credential_device_type').notNull(),
    credentialBackedUp: boolean('credential_backed_up').notNull(),
    transports: text('transports'),
  },
  (authenticator) => ({
    compositePk: primaryKey({
      columns: [authenticator.userId, authenticator.credentialID],
    }),
  }),
);

export const dashboards = pgTable(
  'dashboards',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    schemaVersion: integer('schema_version').notNull().default(1),
    revision: integer('revision').notNull().default(1),
    forest: jsonb('forest').$type<Tree[]>().notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (dashboard) => ({
    userIdUnique: uniqueIndex('dashboards_user_id_unique').on(dashboard.userId),
  }),
);

export const servers = pgTable(
  'servers',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    dashboardId: text('dashboard_id')
      .notNull()
      .references(() => dashboards.id, { onDelete: 'cascade' }),
    branchId: text('branch_id').notNull(),
    name: text('name').notNull(),
    url: text('url').notNull().default(''),
    icon: text('icon').notNull().default(''),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
  },
  (server) => ({
    dashboardBranchUnique: uniqueIndex('servers_dashboard_branch_unique').on(
      server.dashboardId,
      server.branchId,
    ),
    dashboardIdx: index('servers_dashboard_id_idx').on(server.dashboardId),
    branchIdx: index('servers_branch_id_idx').on(server.branchId),
  }),
);

export const serverAgentTokens = pgTable(
  'server_agent_tokens',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    serverId: text('server_id')
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    tokenId: text('token_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    label: text('label'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
    revokedAt: timestamp('revoked_at', { mode: 'date' }),
  },
  (token) => ({
    tokenIdUnique: uniqueIndex('server_agent_tokens_token_id_unique').on(token.tokenId),
    serverIdx: index('server_agent_tokens_server_id_idx').on(token.serverId),
  }),
);

export const serverMetricLatest = pgTable('server_metric_latest', {
  serverId: text('server_id')
    .primaryKey()
    .references(() => servers.id, { onDelete: 'cascade' }),
  stats: jsonb('stats').$type<ServerStats>().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const serverMetricSamples = pgTable(
  'server_metric_samples',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    serverId: text('server_id')
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    recordedAt: timestamp('recorded_at', { mode: 'date' }).notNull().defaultNow(),
    status: text('status').notNull(),
    uptime: text('uptime').notNull().default(''),
    cores: integer('cores'),
    load: jsonb('load').$type<number[]>(),
    cpu: doublePrecision('cpu').notNull().default(0),
    memoryUsed: bigint('memory_used', { mode: 'number' }).notNull().default(0),
    memoryTotal: bigint('memory_total', { mode: 'number' }).notNull().default(0),
    diskUsed: bigint('disk_used', { mode: 'number' }).notNull().default(0),
    diskTotal: bigint('disk_total', { mode: 'number' }).notNull().default(0),
    networkIn: bigint('network_in', { mode: 'number' }).notNull().default(0),
    networkOut: bigint('network_out', { mode: 'number' }).notNull().default(0),
    temperature: doublePrecision('temperature').notNull().default(0),
  },
  (sample) => ({
    serverRecordedAtIdx: index('server_metric_samples_server_recorded_at_idx').on(
      sample.serverId,
      sample.recordedAt,
    ),
    recordedAtIdx: index('server_metric_samples_recorded_at_idx').on(sample.recordedAt),
  }),
);
