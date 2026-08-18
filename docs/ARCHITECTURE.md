# OPAQUE Architecture

## Runtime Boundaries

OPAQUE is a Next.js App Router application backed by Postgres and Drizzle. The dashboard UI is
client-rendered after an authenticated request confirms the current user.

```text
Dashboard page
  -> /api/dashboard/get
  -> dashboard repository
  -> Postgres dashboards.forest

Dashboard editor
  -> runtime Dashboard schema
  -> revision-checked transaction
  -> server projection sync
  -> Postgres

Module widget
  -> /api/modules/data
  -> module provider
  -> upstream service
```

## Persisted Dashboard

`dashboards.forest` is the user-authored document. Two database columns protect its lifecycle:

- `schema_version` identifies the document format understood by the application.
- `revision` increments after every successful save and prevents stale clients from overwriting a
  newer document.

The public Dashboard object carries both values. The update API validates the complete object with
`web/src/lib/schemas/dashboard.ts` before normalization or persistence. A revision mismatch returns
HTTP 409 and leaves the client draft untouched.

Database migrations change storage shape. Dashboard migrations change the JSON document shape.
They are related but separate and both need regression fixtures.

`npm run db:upgrade` performs idempotent document upgrades in a transaction. It validates every
normalized document first, increments the row revision when content changes, and aborts on a
concurrent update. Docker runs it after Drizzle migrations and before starting the web process.

## Modules

A module currently spans four layers:

- metadata and defaults in `web/src/lib/modules.ts`
- persisted configuration schemas in `web/src/lib/schemas/dashboard.ts`
- server-side data fetching in `web/src/lib/moduleProviders.ts`
- editor and widget rendering in `web/src/components/Tree/TreeModule.tsx`

Known module configurations are strict at the Dashboard API boundary. New fields must be added to
the corresponding schema in the same change as their UI/provider implementation.

## Trust Model

- Browser requests and persisted JSON are untrusted input.
- Authentication is checked at every private API route.
- Upstream service responses are untrusted and normalized by providers.
- Service credentials currently remain in module configuration. Moving them into a server-only
  credential store is the next security boundary; do not expand their exposure in the meantime.
- Test fixtures must contain fake hosts and fake credentials only.

## Verification Layers

- TypeScript checks compile-time contracts.
- Runtime schemas protect API and persistence boundaries.
- Unit tests cover migrations, schemas, layout operations, and navigation guards.
- Contract tests cover running HTTP integrations.
- `npm run check` is the required local and CI gate.
- `npm run db:validate` checks persisted dashboards without printing configuration values.
