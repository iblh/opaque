import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

const connectionString =
  process.env.DATABASE_URL || 'postgres://opaque:opaque@localhost:5432/opaque';

type DbGlobal = typeof globalThis & {
  opaqueSql?: postgres.Sql;
};

const globalForDb = globalThis as DbGlobal;

export const sql =
  globalForDb.opaqueSql ||
  postgres(connectionString, {
    max: Number(process.env.POSTGRES_MAX_CONNECTIONS || 10),
    prepare: false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.opaqueSql = sql;
}

export const db = drizzle(sql, { schema });
