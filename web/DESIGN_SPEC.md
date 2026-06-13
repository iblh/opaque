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
- `font-body` (system sans) — everything that is prose or UI copy.
- `font-mono` — all data: numbers, timestamps, urls, types, meta lines, status words.
- Numerals never jitter: `font-variant-numeric: tabular-nums` is set globally on `body`.
- Labels above data use `text-[10px] uppercase tracking-wider text-text-tertiary`.

### Color

- Paper surfaces: `background` `#fafafa→#fff`, cards are `bg-white` with `border-border-light`.
- **One accent: `accent-green` (#7E846B, moss).** It means *alive / active / current* — live status
  dots, playback, active drop targets, hover accents. Never decorative.
- Errors and destructive hovers use the muted rust `accent-red` (#A76767) family. **Never
  `red-500`** — saturated alarm red is off-voice.
- Warnings (e.g. load thresholds) use muted ochre `accent-amber`. Never `amber-500`.
- `accent-blue` is legacy; do not introduce new uses on the dashboard.

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
2. **Card / panel** — border lift only: `border-border-light → border-border-medium`, optional
   `bg-[#fcfcfc]`. No shadows (shadows are reserved for *lifted* drag clones and popovers).
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

- Section title sits flush-left with its content (no indents between title and body).
- Hairline (`border-light`, 1px) is the only divider. Depth comes from spacing, not elevation.
- Radius is `rounded-sm` (2px) for almost everything; `rounded-full` only for status dots and pills.
- WYSIWYG: edit mode must not reshape view mode. Nothing appears in edit mode that occupies layout
  space the view mode doesn't have (edit affordances live in headers, overlays, or handles).

## Litmus tests

Before shipping UI, ask:

1. Did I add anything that is decoration rather than information? Remove it.
2. Does the new state (hover/loading/empty/error) follow the four-hover grammar, skeleton rule, and
   quiet voice? If it needed a new pattern, the pattern belongs in this file first.
3. Would this screen still feel calm printed in a book? (Serif titles, hairlines, mono data —
   if it looks like a dashboard SaaS ad, it's wrong.)
