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

- `font-serif` (Newsreader, **400/500 only**, italic at 400) — **titles only**: masthead wordmark,
  section titles, panel/module titles, group headers. Never for body, buttons, labels, or data.
  The weight range is pinned deliberately: left unbounded, `next/font` serves the full 200–800
  variable axis and a `font-light` heading renders at a real 300 where the design assumes 400.
- `font-sans` (Inter) — everything that is prose or UI copy. A technical grotesk, not the system
  sans — the dashboard must read with a consistent typographic voice across platforms.
- `font-mono` (JetBrains Mono) — all data: numbers, timestamps, urls, types, meta lines, status
  words. This is the workhorse of the archival motif; nearly every ledger / stamp uses it.
- Numerals never jitter: `font-variant-numeric: tabular-nums` is set globally on `body`.
- Labels above data use `text-[10px] uppercase tracking-wider text-text-tertiary`.
- **Mono data is tightened**: a base `-0.02em` letter-spacing on `.font-mono` gives numbers/values a
  dense, technical set (borrowed from searchsystem.co). Elements with an explicit `tracking-*` (the
  wide uppercase SpecHeader / stamp labels) override it, so only untracked data tightens.

### Grid unit

- A base `--unit` (4px) is the invisible grid the data sits on (searchsystem.co uses type-size ==
  grid-unit; OPAQUE adapts it). Spec-sheet ledger rows (`SpecRow`, media stat ledger) are a fixed
  **6-unit (24px)** height so a stack of rows aligns exactly rather than drifting on the baseline.
  Quantize new dense mono rows to unit multiples; **serif titles are exempt** — they breathe freely.

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
5. **Stamped invert** (discrete mono cells/toggles: calendar days, `+N more`) — foreground and
   background swap on hover (`hover:bg-text-primary hover:text-background`), like a stamp, transition
   only color/background (borrowed from searchsystem.co). Use only on small discrete clickable mono
   elements; never on rows (they use #1) or non-interactive chips.

Non-interactive things (section titles, labels, data rows that aren't links) never react to hover.

### Focus

- `:focus-visible` shows a 1px ink outline with 2px offset (defined globally). Never blue rings,
  never glows. Everything clickable must be reachable and visibly focused by keyboard.

### Touch

- Control size is a token (`--opaque-header-control-size`), not a literal. It reads 24px for a mouse
  and **44px under `@media (pointer: coarse)`** — the accessible minimum for a finger. Key this to
  pointer capability, never to viewport width: a narrow window on a laptop should stay dense.
- New controls size themselves from that token (or `.opaque-icon-button`, which does). A hardcoded
  `h-6 w-6` is unreachable on a phone and will not scale.
- Where a control's *drawn* size must stay small — a 24px add button beside a dense list — add
  **`.opaque-tap`**, which grows only the hit area via a centred `::after` on coarse pointers. The
  painted box is unchanged, so nothing shifts between pointer types.
- Rollout is partial: header chrome, the section add control and dialog close buttons are covered.
  The per-module controls inside `TreeModule` are not yet, and are tracked as known debt — do not
  read the token's existence as proof that a given control is reachable.

### Destructive and unsaved state

- The editor's draft lives in memory until saved, so **anything that can drop it must say so first**:
  discard confirms when dirty, and a `beforeunload` guard is registered *only* while
  `isEditing && isDirty` — never permanently, which would nag on every ordinary navigation.
- **Errors tell the user what to do and whether their work survived.** "Network error" is a
  non-answer; "Couldn't reach the server — your changes are still here" is the voice. Map status
  codes to specific, calm sentences rather than echoing a raw failure.
- Parse error responses defensively (`res.json().catch(...)`): a proxy answering HTML must not be
  reported as a network failure, which hides the real status.

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

**The page is a filed sheet.** The dashboard reads as one archived record rather than floating
modules. The masthead *is* the page header — wordmark plus a mono colophon, on a rule whose weight
belongs to the active layout. There is no separate greeting line between the masthead and the
content: in the `sheet` layout the masthead's vertical rules continue straight down through the
modules, so anything inserted between them breaks the frame into two stacked cards.

Pseudo-metadata was removed and must not come back: no invented `SHEET 01/01` / `SCALE 1:1` /
`PAGE 01/01` fields, no decorative crop corners. A datestamp is legitimate because the date is real;
a page number on a single-page app is decoration wearing an instrument's clothes.

**Layout is a preset, not a canvas.** Five authored shells (`sheet` / `ledger` / `journal` / `bento`
/ `catalog`, from prototypes A / C / K / M / X) own placement: each declares which region every
module root belongs to, and the user picks a shell rather than dragging modules. Editing therefore
reorders a module only *within its own column* — cross-column dragging has no meaning when the
layout owns composition. Per-layout typography lives in `globals.css` keyed on `data-layout`, so
components emit stable hooks (`.proto-heading`, `.proto-link`, `.proto-masthead`) and never branch
on layout in the React tree.

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
