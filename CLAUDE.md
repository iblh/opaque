# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**OPAQUE** — a self-hosted personal start page / homelab dashboard. A user signs in, then organizes Bookmarks, Applications, and Servers into named groups ("branches") rendered as a vertical "forest". Server cards display near-live system metrics pushed by an agent script running on each remote machine.

The active app lives in [web/](web/) (Next.js 15 + React 19 + MongoDB). [react-frontend/](react-frontend) and [front-end/](front-end) directories are **not present** in this checkout — the repo root README mentions them as historical reference points only; do not look for them.

All work happens inside `web/`. There is no monorepo tooling at the root — the root just holds the README and this file.

## Commands

Run from `web/`:

```bash
cp .env.example .env.local      # first time only; fill in MONGO_URL, JWT_SECRET, SERVER_INGEST_TOKEN
npm install
npm run dev                     # Next dev server on http://localhost:3000
npm run build                   # production build
npm run start                   # serve the built app
npm run lint                    # ESLint (next/core-web-vitals + next/typescript)
npm run mock:server-agent       # fake server agent that POSTs metrics every 2s; needs SERVER_ID + SERVER_INGEST_TOKEN
```

All `next` commands run under `NODE_OPTIONS=--no-experimental-webstorage` — this flag is set in `package.json` scripts because the project relies on it; don't strip it.

**There is no test suite.** Don't invent `npm test`, `jest`, or `playwright` commands — none are wired up. The user-level `~/.claude/rules/testing.md` mentions Playwright as the recommended framework, but it is *not* installed here. If asked to add tests, set it up first.

TypeScript is `strict: true` and uses path alias `@/* → ./src/*`. ESLint disables `no-unused-vars` and `no-explicit-any` — that's intentional, the codebase uses `any` casts at MongoDB / JWT boundaries.

## Architecture

### One MongoDB document per user, holding the whole dashboard

A user's dashboard is a single document in the `dashboards` collection of the `opaque` database. The shape is:

```ts
{ email?, username?, name?, forest: Tree[], createdAt, updatedAt }
// where Tree = { root: 'bookmarks' | 'applications' | 'servers' | <custom>, branches: Branch[] }
// and Branch is a discriminated union (BookmarkBranch | ApplicationBranch | ServerBranch) keyed by tree.root
```

[src/lib/types.ts](web/src/lib/types.ts) defines these. [src/lib/dashboard.ts](web/src/lib/dashboard.ts) is the canonical serializer/normalizer — `normalizeDashboard` repairs legacy shapes (an old `branches` array at the top level is wrapped into `{ root: 'bookmarks', branches }`), fills in missing IDs, sanitizes SVG icons, and guarantees the three default roots in order. **Always route reads/writes through `normalizeDashboard` and `serializeDashboard`** so the client never sees a half-migrated document.

ID handling: Mongo `_id` is converted to a string `id` for the client; the client never sends `_id` back. Identity comes from the JWT claims (`email` and/or `username`), and the Mongo filter is `{ email }` or `{ username }` (or `$or` of both when both are present). There is no separate `users → dashboards` join — a user *is* a dashboard, looked up by identity claims.

### App Router layout

`src/app/` is a small Next 15 App Router tree:

- `app/page.tsx` (client component) — the dashboard. Fetches `GET /api/dashboard/get` on mount, renders one Tree component per branch root, and toggles edit mode. While not editing, it polls `GET /api/server/metrics` every 5 s and merges the latest `stats` into the matching `ServerBranch` in place. Editing freezes the poll so the user's draft is not overwritten.
- `app/login/page.tsx` — login form; accepts email *or* username in a single `identifier` field.
- `app/layout.tsx` — global shell + `<CookieBanner />`.
- `app/api/...` — see below.

### API routes (all under `src/app/api/`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `user/signup` | POST | none | Create account (`bcrypt` hash, set `jwt_token` cookie). |
| `user/login` | POST | none | Look up by `$or: [{ email }, { username }]`, verify bcrypt, set cookie. Accepts `identifier`, `email`, or `username` field. |
| `user/logout` | POST | cookie | Clear cookie. |
| `dashboard/get` | GET | cookie | Read or auto-create the dashboard for the identity in the JWT. If the stored document is legacy (no `forest`), it gets re-saved with a normalized one. |
| `dashboard/update` | PUT/POST | cookie | Upsert the dashboard's `forest` for the identity in the JWT. The body's `id`/`_id` is ignored — identity decides ownership. |
| `server/metrics` | GET | cookie | Return `[{ id, stats }]` for every server card the user has saved. |
| `server/metrics` | POST | Bearer `SERVER_INGEST_TOKEN` | Agent endpoint. Finds the dashboard whose `forest` contains a server branch with the given `serverId` and writes `stats` into it using a positional `$set` with `arrayFilters`. Returns 404 if no document contains that server id. |
| `icons/search` | GET | cookie (Next default) | Searches the bundled `simple-icons` package by title/slug/alias and returns matched SVGs. |

**Server metrics push model.** Each remote machine runs `scripts/opaque-agent.sh` (or `scripts/mock-server-agent.mjs` for local testing). The agent reads `/proc` and posts to `POST /api/server/metrics` every few seconds. Stats are stored *inside* the dashboard document, on the matching `ServerBranch`. A 404 from the ingest endpoint means the user has not yet saved a server card with that `serverId` — the dashboard's "Agent id" must be copied into the agent's `SERVER_ID` env var *and* the dashboard must be saved before the first push will land. The dashboard UI marks cards stale after >30 s without a `stats.updatedAt` refresh; staleness is computed client-side.

### Auth

`src/lib/auth.ts` is a thin wrapper around `jsonwebtoken`. Tokens are stored in an `httpOnly`, `sameSite: 'strict'`, `secure` (outside dev) cookie named `jwt_token`. `cookieMaxAge` parses simple expressions like `'3d'`, `'12h'` into seconds. There is no refresh flow — when the token expires the user is bounced to `/login`. `JWT_SECRET` falls back to a hardcoded string if unset; treat that fallback as **dev-only**, anything reading prod env must set it.

### Icons

Icons are inlined SVG strings stored on each leaf/branch. Two pipelines feed them:

- **Presets**: [src/lib/iconPresets.ts](web/src/lib/iconPresets.ts) pulls icon paths from `simple-icons` at build time and wraps them in minimal `<svg viewBox="0 0 24 24"><path d="..."/></svg>` strings, grouped by category (General, Dev, Design, Infra, Media, Work). The bookmark / application / server pickers (`IconField`) use these presets first.
- **Search**: `/api/icons/search` reads `simple-icons/icons.json` and lazily loads the matched `.svg` files from `node_modules/simple-icons/icons/<slug>.svg`. This means production builds must keep `simple-icons` in `dependencies` (it's not just a dev-time data source) and the deploy needs read access to the package's `icons/` directory.

All SVGs ingested from user input go through `sanitizeSvg` in [src/lib/svg.ts](web/src/lib/svg.ts) — it strips `<script>` blocks, inline `on*=` handlers, and `javascript:` URIs, then falls back to a default if the input isn't a `<svg ...>` root. This is the only XSS defense for the icon strings, which are subsequently rendered via `dangerouslySetInnerHTML` in `SvgIcon`. **If you add a new entry point for icons (drag-drop, paste, AI-generated), route it through `sanitizeSvg`.**

### Drag & drop

`react-dnd` is in `package.json` but the Tree components implement reordering with the **native HTML5 drag API** plus the helpers in [src/lib/drag.ts](web/src/lib/drag.ts) (`setDragPreview`, `getDropPlacement`, `getSpatialDropPlacement`). `getSpatialDropPlacement` decides whether the drop lands "before" or "after" the target by tracking the ghost preview's geometry vs the source, with a hysteresis threshold (`SWAP_THRESHOLD = 0.55`) to avoid jittery swaps. Edit the constants there, not in the Tree components.

### Visual system

Tailwind with a custom palette (`accent-green`, `text-primary`, `ink-*`, `surface-*`) defined in [tailwind.config.js](web/tailwind.config.js). The design intent is documented in [web/DESIGN_SPEC.md](web/DESIGN_SPEC.md): "Wabi-Sabi Minimalist Brutalism" — translucent surfaces, ink-based grayscale, sparing accents, uppercase-tracking labels. Match this aesthetic when adding UI. Iconography is from `@tabler/icons-react` (for UI chrome) and `simple-icons` (for brand glyphs); do not add a third icon library.

## Things to know before editing

- **Editing the dashboard mutates a draft, not the live dashboard.** `page.tsx` keeps `dashboard` (server truth) and `draftDashboard` (editor state) separate. Tree components receive the draft and call `onTreeChange`, which sets `isDirty`. Save sends the draft to `/api/dashboard/update`; cancel resets the draft from `dashboard`. The live polling loop only writes to `dashboard`, not `draftDashboard`, so a user's unsaved edits are never clobbered by an incoming metrics tick — but it also means the freshest stats *will not* appear in the draft until they exit edit mode and the next poll fires.
- **The legacy non-`forest` document path is real and gets triggered on first read of an old account.** `dashboard/get` checks `Array.isArray(rawDashboard.forest)` and persists a normalized copy when missing. Don't remove this — Svelte-era users still exist in the wild per the web README.
- **`SERVER_INGEST_TOKEN` is a shared bearer for all agents** — every server uses the same token. Treat it like a fleet-wide secret; rotating it means updating every running agent.
- **MongoDB connection is a module-level singleton** in `src/lib/db.ts`. Next dev mode can re-import this module on HMR; the current code does not guard against multiple clients, which is fine in practice because the second import returns the cached `_db`. If you add reconnect logic, be aware of HMR.
- **`page.tsx` is a `'use client'` component** and does the dashboard fetch on the client (so a 401 redirects to `/login`). Don't try to convert it to a Server Component without first moving the auth gate into middleware.
- **Search bar in `Header.tsx`** stores the chosen provider (`google` / `duckduckgo` / `chatgpt`) in `localStorage` under `opaque_search_provider`. New providers go in [src/lib/searchProviders.ts](web/src/lib/searchProviders.ts) — don't hardcode URLs in the Header.

## Deployment notes

- Self-host pattern: the web app on one machine (with MongoDB), and each watched server runs `scripts/opaque-agent.sh` under systemd. The web README has the full systemd unit and `/etc/opaque-agent.env` recipe.
- `mongodb` driver runs in the Next server runtime; routes are implicitly Node (not Edge). Don't add `export const runtime = 'edge'` to these routes — the Mongo driver is incompatible.
- Logging is `console.error` only. There's no structured logger. The user-level rule says no `console.log` in production; the existing `console.error` lines in API routes are accepted (they're error-path only).

## User instructions

Coding style, testing, and security guidance loaded from `~/.claude/rules/` (TypeScript/JS style, no `any` in new code, Zod for new validation, no hardcoded secrets) — apply these to new code. The existing API routes use `as any` casts at the JWT / MongoDB boundary; don't go on a wholesale cleanup unless asked, but do prefer typed approaches for new endpoints.
