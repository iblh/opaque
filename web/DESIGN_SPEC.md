# OPAQUE Design Spec — Quiet Instrumentality

> 安静的工具主义。这份文档是所有 UI 决策的最终依据；新代码与这里冲突时，改代码。

## The idea

OPAQUE reads like a well-set technical almanac: high information density delivered in a low voice.
Editorial minimalism meets wabi-sabi — serif carries the human voice, monospace carries the honest
numbers, whitespace carries the breathing room. **Restraint itself is the identity: others add
effects; we don't.**

Three lineages, one temperament:

- **Wabi-sabi** — paper-like surfaces, hairline rules, asymmetry tolerated, time made visible
  ("2 days ago" matters more than a spinner).
- **Editorial minimalism** — Goudy serif titles set like book headings; content reads in columns;
  typography is the layout.
- **Quiet brutalism** — sharp 2px corners, honest borders, no decoration that isn't information.

## Hard rules

These are enforceable review criteria, not vibes.

### Type

- `font-serif` (Sorts Mill Goudy, 400) — **titles only**: welcome line, section titles, panel/module
  titles, group headers. Never for body, buttons, labels, or data.
- `font-body` (Geist) — everything that is prose or UI copy. A technical grotesk, not the system
  sans — the dashboard must read with a consistent typographic voice across platforms.
- `font-mono` (Geist Mono) — all data: numbers, timestamps, urls, types, meta lines, status words.
  This is the workhorse of the archival motif; nearly every SpecHeader / ledger / stamp uses it.
- Numerals never jitter: `font-variant-numeric: tabular-nums` is set globally on `body`.
- Labels above data use `text-[10px] uppercase tracking-wider text-text-tertiary`.

### Color

- **All color is tokenized through CSS variables** (defined in `globals.css`, surfaced as Tailwind
  tokens). Components use the semantic tokens (`text-primary`, `surface-sunken`, `border-light`,
  `ink-*`, `accent-*`, …) — **never hardcode hex or `bg-white`/`bg-[#…]`**, so the palette can flip
  with the theme.
- **Two themes, one voice.** Light is the paper default (`--page-bg #fafafa`, near-white surfaces,
  ink text). Dark is an ink canvas (`#1B1C1E`) with paper-light text; the `ink-*` ramp inverts so a
  mid-tone like `ink-700` stays a mid-tone in both. Quiet Instrumentality is identical in both —
  same hierarchy, hairlines, restraint. Theme = light / dark / system (default), persisted to
  `localStorage` and applied pre-paint via a `<head>` script (no flash); `.dark` on `<html>`.
- **One accent: `accent-green` (moss).** It means *alive / active / current* — live status dots,
  playback, active drop targets, hover accents. Never decorative. (Lifts slightly in dark to stay
  legible.)
- Errors and destructive hovers use the muted rust `accent-red` family. **Never `red-500`** —
  saturated alarm red is off-voice.
- Warnings (e.g. load thresholds) use muted ochre `accent-amber`. Never `amber-500`.
- `accent-blue` is legacy; do not introduce new uses on the dashboard.
- Alpha-on-token utilities (e.g. `bg-surface-sunken/50`) are fine — the tokens resolve to full
  colors, so Tailwind composites the alpha normally in both themes.

### Motion

- One budget: `180ms` `cubic-bezier(0.2, 0.6, 0.2, 1)` — these are the Tailwind defaults
  (`transition-*` with no explicit duration/easing). Do not write `duration-150`/`duration-200`
  unless there is a measured reason.
- Motion only on state change (hover, active, enter, drag). Nothing animates for decoration.
- Loading is skeletons that match the real content structure — never spinners, never layout shift.

### Hover — the single grammar

Hover exists **only on interactive elements**, and means exactly one of four things:

1. **Row / list item** (links in lists: posts, bookmark leaves, app leaves) — soft surface lift
   `hover:bg-surface-sunken/70` on a padded `-mx-2 px-2 rounded-sm` row; title darkens; the
   accent-green hairline may appear (left rule or underline).
2. **Module / card** — modules are **borderless** (see Structure). View mode never lifts a border;
   if a draggable unit needs to read as a unit in *edit* mode, use a faint `hover:bg-surface-sunken/50`
   surface and a dashed `outline` as a drop/merge target — never a permanent border, never a shadow
   (shadows are reserved for *lifted* drag clones and popovers).
3. **Icon / utility button** — `text-text-muted → text-text-primary` plus `hover:bg-surface-sunken`
   (`.opaque-icon-button` pattern). Destructive variants darken to `accent-red-dark`.
4. **Text link / tab** — color darkens toward ink; hairline underline appears or strengthens.

Non-interactive things (section titles, labels, data rows that aren't links) never react to hover.

### Focus

- `:focus-visible` shows a 1px ink outline with 2px offset (defined globally). Never blue rings,
  never glows. Everything clickable must be reachable and visibly focused by keyboard.

### Voice

- UI copy is short, lowercase-calm, and a little human. Empty states get one quiet line
  ("Nothing new today.") — never exclamation marks, never robotic ("No data available").
- Time is shown relatively ("2 days ago") wherever freshness is the point.

### Structure

- **Modules are borderless.** Bookmarks, applications, servers, weather, calendar, markets, media,
  and posts all render as content on the page with no card outline and no `bg-white` fill —
  separation comes from whitespace and the section title alone. This keeps the page integral rather
  than fragmented into boxes. (Edit mode may add a faint surface tint to mark a draggable unit; see
  hover grammar #2.) Poster/thumbnail *images* keep a hairline frame — that's content, not a card.
- **Each glanceable widget is its own top-level section.** weather / calendar / markets are
  independent single-module roots (not bundled under a "Today" section), each freely placeable and
  resizable on the layout grid. media and posts remain multi-module roots.
- Section title sits flush-left above its content with **no trailing rule**; the title alone opens
  the section. The page has no decorative hairlines between a title and its body, and no rule above
  the welcome line.
- Depth comes from spacing, not elevation or outlines. Radius is `rounded-sm` (2px) where anything
  is rounded; `rounded-full` only for status dots and pills.
- A single module root carries its name once — in the section header. The module panel inside it
  omits its own redundant title row (it keeps only the status/refresh control).
- WYSIWYG: edit mode must not reshape view mode. Nothing appears in edit mode that occupies layout
  space the view mode doesn't have (edit affordances live in headers, overlays, or handles).

### Spec-sheet primitives (data-dense modules)

Modules that report structured data — media providers, server telemetry — render like a printed
spec sheet, **not** as a stack of nested cards. The shared primitives in
`components/Tree/specPrimitives.tsx` encode this; reach for them before inventing per-module markup.

- **No boxes-in-boxes.** A module never wraps sub-groups in their own bordered/`bg-surface` cards.
  Internal structure comes from hairline rules and a shared alignment grid.
- **`SpecCaption`** titles a block: a mono `uppercase tracking-[0.14em]` caption on a single
  bottom hairline, with an optional tabular aside on the right. This is the only internal "header".
- **`SpecRow` / `SpecRows`** are the ledger: label left (mono, tertiary), value right (mono,
  `tabular-nums`), baseline-aligned, separated by faint dividers. Two ledgers side by side make a
  two-column fact sheet.
- **`SpecMetric`** is a glanceable gauge: tiny label + tabular value over an optional **1px** bar on
  a hairline track (`bg-border-light`). Tone (ok/warn/crit → moss/amber/rust) appears only under load.
- **`MetaChip` / `MetaChipGroup`** replace bordered "badges": a borderless `surface-sunken` chip,
  label and value split by a single hairline. Use for repeated metadata (library counts, facts).
- **`Sparkline`** is the one trend language: a 1.25px non-scaling polyline with an optional 8%-opacity
  area fill. `tone` carries meaning (`up`/`down`/`accent`), default `ink` stays quiet. No chart libs.
- Status reads as a bare mono label + dot (`online` moss, `stale` muted) — not a filled pill.

### Signature archival elements (the memory points)

OPAQUE should read as a *private archive instrument*, not a generic dashboard. Three signature
devices (and only these — resist adding more) carry that identity. They come from object-ness —
codes, registration marks, stamps — never from paper grain or scan textures (we add none).

- **`SpecHeader`** — every data module opens with a filed-record index line: a fixed module code +
  provenance on the left (`CAL / LOCAL`, `WTHR / LIVE`, `MKT / LIVE`, `MED / <PROVIDER>`, `SRV / LIVE`,
  `IDX`), and an optional serial beside a `⌖` registration mark on the right (`2026·06`, `4 SYM`,
  `°F`). Codes are stable semantic labels, not derived coordinates. This repeating line is *the*
  memory point — keep it on every module.
- **`RegistrationMark`** — four corner crop-ticks framing a value. The site's "current / active"
  marker: calendar *today*, and (faintly, on hover via `hoverTickClass`) the cell the cursor is on.
  Reserved for genuinely singular current items — never a general highlight. Solid ink when active.
- **`Stamp`** — the one status language, drawn like an inspection stamp (mono uppercase + small dot),
  never a filled pill: `online`/`stale`, media `N playing`, market `▲/▼` deltas, `syncing` (pulsing).

Each module also takes a distinct-but-related *archival form*: Calendar = month **ledger** (a `WK`
week-number gutter, registration today); Weather = station **bulletin** (measurement figure + unit
tick + station metadata); Markets = ticker **instrument list** (oscilloscope traces, stamped deltas);
Media = catalog **drawer** per provider; Server = telemetry **instrument**; Posts = **index** with
folder-divider tabs.

State pages stay in-character: **loading** is a blank record filling (hairline value `Slot`s + a calm
`recordSweep`, never a generic pulse); **empty** is a blank catalog card (`NIL` stamp + one terse
line); **error** is an inspection note (`NO READING ✕` over a faint rust rule), never a red alert.

Interaction is mechanical, not web-app: hover slides a guide-rule / reveals registration ticks like a
ruler cursor — not a flat background tint.

**The page is a filed sheet.** The dashboard is wrapped in a document shell so the whole thing reads
as one archived record, not floating modules:
- A **masthead** above the greeting — `OPAQUE` wordmark + `personal archive` on the left, mono
  datestamp fields on the right (`SHEET 01/01 · DATE <ISO> · TZ <offset>`), on a hairline rule.
  Date/TZ are computed client-side (avoid SSR locale mismatch).
- Faint **registration / crop corners** on the content frame (`DocumentFrame`) — the page edges.
- A **footer colophon** mirroring the masthead: `DOC · SCALE 1:1 · PAGE 01/01 · © OPAQUE`, on the
  same page margins.

**Live numbers are mechanical readouts.** Values that change on poll use `RollingNumber` — each digit
is a 0–9 reel that rolls to the new value like a counter/instrument (markets price + delta, weather
temperature, server CPU/mem/disk). Animate only after the first change (no roll-from-zero on load),
honor `prefers-reduced-motion`, keep the string monospaced + tabular so columns never shift. This is
the one place motion is *expressive* rather than purely functional — use it only for genuinely live
figures, never for static labels.

## Litmus tests

Before shipping UI, ask:

1. Did I add anything that is decoration rather than information? Remove it.
2. Does the new state (hover/loading/empty/error) follow the four-hover grammar, skeleton rule, and
   quiet voice? If it needed a new pattern, the pattern belongs in this file first.
3. Would this screen still feel calm printed in a book? (Serif titles, hairlines, mono data —
   if it looks like a dashboard SaaS ad, it's wrong.)
