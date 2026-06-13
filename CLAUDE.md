# OPAQUE

A quiet, self-hosted dashboard (bookmarks / applications / servers / today / media / posts).
Next.js 15 App Router + Tailwind, Postgres via Drizzle, all dashboard UI client-rendered.

## Design system — read before any UI work

The design philosophy is **Quiet Instrumentality** and it is codified in
[web/DESIGN_SPEC.md](web/DESIGN_SPEC.md). That file is the source of truth for every visual and
interaction decision. Non-negotiables, summarized:

- Serif (`font-serif`) for titles only; mono for data; sans for prose. Tabular numerals globally.
- One accent (moss `accent-green`) meaning *alive/active*; errors use muted rust `accent-red`
  (never `red-500`); warnings use `accent-amber` (never `amber-500`); no new `accent-blue` usage.
- Motion: 180ms / one easing — the Tailwind defaults. No explicit `duration-*` without a reason.
  Motion only on state change. Loading = structure-matched skeletons, never spinners.
- Hover only on interactive elements, following the four-pattern grammar in the spec
  (row lift / card border lift / icon button / text link).
- Focus: global 1px ink `:focus-visible` outline. Keyboard reachability is required.
- Voice: short, calm, slightly human ("Nothing new today."); relative time for freshness.
- WYSIWYG: edit mode never reshapes view mode.

When a new UI pattern is genuinely needed, add it to `web/DESIGN_SPEC.md` in the same PR.

## Working conventions

- App code lives in `web/`. Run checks from `web/`: `npx tsc --noEmit`, `npm run lint`,
  `npm run build`.
- Branch from `master` per feature; PRs to `master`. Conventional commit messages.
- The dashboard layout model: `Tree.layout = { rowId, rowIndex, colIndex, widthPct }`;
  pure layout ops in `web/src/lib/dashboardLayout.ts`.
- Module data flows: `web/src/lib/moduleProviders.ts` (server fetch) →
  `/api/modules/data` → `useModuleData` (client cache + silent refresh) → widgets in
  `web/src/components/Tree/TreeModule.tsx`.
- Never commit real service credentials or dashboard data; verification against the live
  dashboard must discard draft changes.
