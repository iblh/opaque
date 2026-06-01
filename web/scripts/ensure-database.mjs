import postgres from 'postgres';
import { existsSync, readFileSync } from 'node:fs';

loadEnvFile('.env');
loadEnvFile('.env.local');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const targetUrl = new URL(databaseUrl);
const databaseName = targetUrl.pathname.slice(1);

if (!databaseName) {
  console.error('DATABASE_URL must include a database name.');
  process.exit(1);
}

const maintenanceUrl = new URL(targetUrl);
maintenanceUrl.pathname = '/postgres';

const sql = postgres(maintenanceUrl.toString(), { max: 1 });

try {
  const existing = await sql`
    select 1 from pg_database where datname = ${databaseName}
  `;

  if (existing.length > 0) {
    console.log(`Database ${databaseName} already exists.`);
  } else {
    await sql`create database ${sql(databaseName)}`;
    console.log(`Created database ${databaseName}.`);
  }
} finally {
  await sql.end();
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = line.indexOf('=');
    if (index < 0) continue;

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
