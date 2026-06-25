# OPAQUE Design Spec — Archival Technical Minimalism

> 档案式工具面板美学。这份文档是所有 UI 决策的最终依据；新代码与这里冲突时，改代码。

## The idea

OPAQUE reads like a personal dashboard printed as a technical archive: high information density,
quiet hierarchy, paper texture, instrument-panel precision. Editorial minimalism meets archival
spec sheets — serif carries the human voice, condensed labels carry the catalog system, monospace
carries the honest numbers, whitespace carries the breathing room. **Restraint itself is the
identity: others add effects; we don't.**

Four lineages, one temperament:

- **Wabi-sabi** — paper-like surfaces, hairline rules, asymmetry tolerated, time made visible
  ("2 days ago" matters more than a spinner).
- **Editorial minimalism** — Goudy serif titles set like book headings; content reads in columns;
  typography is the layout.
- **Technical archives** — spec labels, section codes, thin rules, small tables, diagrams, and
  instrument-like status marks. Every artifact-looking element must encode information.
- **Quiet brutalism** — sharp 2px corners, honest borders, no decoration that isn't information.

## Hard rules

These are enforceable review criteria, not vibes.

### Type

- `font-serif` (Sorts Mill Goudy, 400) — **titles only**: welcome line, section titles, panel/module
  titles, group headers. Never for body, buttons, labels, or data.
- `font-condensed` (IBM Plex Sans Condensed) — catalog labels: section codes, buttons, settings
  labels, spec chips, small uppercase headers. It gives the interface its archival / instrument
  tone without turning body copy into a poster.
- `font-body` (system sans) — everything that is prose or UI copy.
- `font-mono` — all data: numbers, timestamps, urls, types, meta lines, status words.
- Numerals never jitter: `font-variant-numeric: tabular-nums` is set globally on `body`.
- Labels above data use `.opaque-spec-label`; cross-section kickers use `.opaque-kicker`.

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
- The page canvas uses a subtle CSS-only paper grain and faint horizontal rule. It must remain
  barely perceptible: if it competes with text, it is too strong.

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
- Section headers are small spec strips: a non-persistent section code (`A:01 / weather`), a serif
  title, and one hairline rule. The code/rule provide location and grouping, not decoration.
- Depth comes from spacing, not elevation or outlines. Radius is `rounded-sm` (2px) where anything
  is rounded; `rounded-full` only for status dots and pills.
- A single module root carries its name once — in the section header. The module panel inside it
  omits its own redundant title row (it keeps only the status/refresh control).
- WYSIWYG: edit mode must not reshape view mode. Nothing appears in edit mode that occupies layout
  space the view mode doesn't have (edit affordances live in headers, overlays, or handles).

## Litmus tests

Before shipping UI, ask:

1. Did I add anything that is decoration rather than information? Remove it.
2. Does the new state (hover/loading/empty/error) follow the four-hover grammar, skeleton rule, and
   quiet voice? If it needed a new pattern, the pattern belongs in this file first.
3. Would this screen still feel calm printed in a book? (Serif titles, hairlines, mono data —
   if it looks like a dashboard SaaS ad, it's wrong.)
