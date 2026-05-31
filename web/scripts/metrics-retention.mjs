import postgres from 'postgres';

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
