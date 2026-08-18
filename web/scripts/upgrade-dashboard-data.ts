import { and, eq } from 'drizzle-orm';
import { isDeepStrictEqual } from 'node:util';
import { dashboards } from '../src/db/schema';
import { db, sql } from '../src/db/client';
import { normalizeDashboard } from '../src/lib/dashboard';
import { CURRENT_DASHBOARD_SCHEMA_VERSION } from '../src/lib/dashboardVersion';
import {
  dashboardSchema,
  formatSchemaIssues,
} from '../src/lib/schemas/dashboard';

async function main() {
  const rows = await db.select().from(dashboards);
  let upgradedCount = 0;

  await db.transaction(async (tx) => {
    for (const [index, row] of rows.entries()) {
      const normalized = normalizeDashboard({
        id: row.id,
        schemaVersion: row.schemaVersion,
        revision: row.revision,
        forest: row.forest,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
      const parsed = dashboardSchema.safeParse(normalized);

      if (!parsed.success) {
        const issues = formatSchemaIssues(parsed.error)
          .map((issue) => `${issue.path || '<root>'}: ${issue.message}`)
          .join('; ');
        throw new Error(`Dashboard row ${index + 1} cannot be upgraded: ${issues}`);
      }

      const nextForest = JSON.parse(JSON.stringify(parsed.data.forest));
      const documentChanged = !isDeepStrictEqual(row.forest, nextForest);
      const versionChanged = row.schemaVersion !== CURRENT_DASHBOARD_SCHEMA_VERSION;
      if (!documentChanged && !versionChanged) continue;

      const [updated] = await tx
        .update(dashboards)
        .set({
          schemaVersion: CURRENT_DASHBOARD_SCHEMA_VERSION,
          revision: row.revision + 1,
          forest: nextForest,
          updatedAt: new Date(),
        })
        .where(and(
          eq(dashboards.id, row.id),
          eq(dashboards.revision, row.revision),
        ))
        .returning({ id: dashboards.id });

      if (!updated) {
        throw new Error('Dashboard data changed while the upgrade was running; no rows were upgraded.');
      }
      upgradedCount += 1;
    }
  });

  console.log(`Upgraded ${upgradedCount} of ${rows.length} dashboard${rows.length === 1 ? '' : 's'}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Dashboard upgrade failed.');
    process.exitCode = 1;
  })
  .finally(() => sql.end());
