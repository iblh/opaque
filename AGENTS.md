# OPAQUE Agent Guide

This file is the operational contract for coding agents working in this repository.

## Read First

1. Read `CLAUDE.md` for repository conventions.
2. Read `web/DESIGN_SPEC.md` before changing UI or interaction behavior.
3. Read `docs/ARCHITECTURE.md` before changing persistence, API routes, or modules.

## Required Workflow

- Work in `web/` unless the task is repository-wide.
- Keep changes scoped; do not rewrite unrelated user work.
- Never use real dashboard data, service tokens, cookies, or production credentials in tests.
- Treat Dashboard JSON as versioned persisted data. Update its schema and migration path together.
- Use runtime schemas at untrusted boundaries. TypeScript types alone are not validation.
- Generate a Drizzle migration after changing `web/src/db/schema.ts`.
- Run `npm run db:upgrade` when a Dashboard document migration is introduced.
- Run `npm run db:validate` after changing Dashboard schemas or migrations.
- Run `npm run check` before considering a change complete.
- For UI changes, verify the affected workflow at desktop and mobile widths.

## Dashboard Contract

- `schemaVersion` describes the persisted Dashboard document format.
- `revision` provides optimistic concurrency; every update must match the stored revision.
- `/api/dashboard/update` is the write boundary and must validate its complete request.
- Normalization preserves supported legacy data; it must reject future schema versions.
- A failed save must never discard the in-memory draft.

## Module Checklist

When adding or changing a module, update all relevant surfaces:

- `web/src/lib/types.ts`
- `web/src/lib/modules.ts`
- `web/src/lib/schemas/dashboard.ts`
- `web/src/lib/moduleProviders.ts`
- `web/src/components/Tree/TreeModule.tsx`
- deterministic fixtures and unit tests

The long-term direction is a single typed module registry. Until that refactor lands, tests must
guard against missing one of these surfaces.

## Verification

Run from `web/`:

```bash
npm run check
npm run db:upgrade
npm run db:validate
```

Contract tests additionally require a running authenticated application and test setup:

```bash
CONTRACT_BASE_URL=http://localhost:3000 npm run test:contract
```
