import postgres from 'postgres';
import { existsSync, readFileSync } from 'node:fs';

loadEnvFile('.env');
loadEnvFile('.env.local');

const retentionDays = Number(process.env.METRICS_RETENTION_DAYS || 7);
const databaseUrl = process.env.DATABASE_URL || 'postgres://opaque:opaque@localhost:5432/opaque';

if (!Number.isFinite(retentionDays) || retentionDays < 1) {
  console.error('METRICS_RETENTION_DAYS must be a positive number.');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  const result = await sql`
    delete from server_metric_samples
    where recorded_at < now() - (${retentionDays}::text || ' days')::interval
  `;

  console.log(`Deleted ${result.count} metric samples older than ${retentionDays} day(s).`);
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
