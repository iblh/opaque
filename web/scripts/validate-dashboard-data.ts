import { dashboards } from '../src/db/schema';
import { db, sql } from '../src/db/client';
import { isDeepStrictEqual } from 'node:util';
import {
  dashboardSchema,
  formatSchemaIssues,
} from '../src/lib/schemas/dashboard';
import { normalizeDashboard } from '../src/lib/dashboard';

async function main() {
  const rows = await db.select().from(dashboards);
  let invalidCount = 0;
  let migrationCount = 0;

  for (const [index, row] of rows.entries()) {
    const stored = {
      id: row.id,
      schemaVersion: row.schemaVersion,
      revision: row.revision,
      forest: row.forest,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    const normalized = normalizeDashboard(stored);
    const result = dashboardSchema.safeParse(normalized);

    const normalizedForest = result.success
      ? JSON.parse(JSON.stringify(result.data.forest))
      : normalized.forest;
    if (!isDeepStrictEqual(stored.forest, normalizedForest)) {
      migrationCount += 1;
    }

    if (result.success) continue;
    invalidCount += 1;
    console.error(`Dashboard row ${index + 1} is invalid:`);
    formatSchemaIssues(result.error).forEach((issue) => {
      console.error(`  ${issue.path || '<root>'}: ${issue.message}`);
    });
  }

  if (invalidCount > 0) {
    throw new Error(`${invalidCount} of ${rows.length} dashboards failed validation.`);
  }

  const migrationNote = migrationCount > 0
    ? ` ${migrationCount} require a lazy document migration on their next save.`
    : '';
  console.log(`Validated ${rows.length} dashboard${rows.length === 1 ? '' : 's'}.${migrationNote}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Dashboard validation failed.');
    process.exitCode = 1;
  })
  .finally(() => sql.end());
