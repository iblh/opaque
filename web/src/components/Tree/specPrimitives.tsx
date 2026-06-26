import React from 'react';

// ---------------------------------------------------------------------------
// Archival Technical Minimalism — shared visual primitives.
//
// The dashboard's structure comes from alignment and hairline rules, not from
// nested rounded cards. These primitives encode that discipline so every module
// (Media, Server, …) reads like a printed spec sheet: a mono caption header, a
// ledger of label/value rows on a shared grid, borderless metadata chips, and a
// single sparkline language. Colors are token-driven so dark mode follows.
// ---------------------------------------------------------------------------

/**
 * A technical sub-section header: a small mono caption on the left, optional
 * aside on the right, sitting on a hairline rule. Used to title a block inside
 * a module (e.g. "Libraries", "Telemetry") without a boxed container.
 */
export function SpecCaption({
  children,
  aside,
  className = '',
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-b border-border-light pb-1.5 ${className}`}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
        {children}
      </span>
      {aside != null && (
        <span className="font-mono text-[10px] tabular-nums text-text-muted">{aside}</span>
      )}
    </div>
  );
}

/**
 * A registration / crop mark: four corner ticks framing a content box, the way a
 * print sheet marks a registered area. The site's signature "focus/today" frame
 * — used instead of a filled highlight so a marked cell reads as an instrument
 * target, not a button. Renders its children centered inside the marked area.
 */
export function RegistrationMark({
  children,
  active = true,
  size = 6,
  className = '',
}: {
  children: React.ReactNode;
  /** When false, ticks are hidden (children render bare) — for hover/idle. */
  active?: boolean;
  /** Tick arm length in px. */
  size?: number;
  className?: string;
}) {
  const arm = `${size}px`;
  const tick = active ? 'border-text-primary' : 'border-transparent';
  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      <span aria-hidden className={`pointer-events-none absolute left-0 top-0 border-l border-t ${tick}`} style={{ width: arm, height: arm }} />
      <span aria-hidden className={`pointer-events-none absolute right-0 top-0 border-r border-t ${tick}`} style={{ width: arm, height: arm }} />
      <span aria-hidden className={`pointer-events-none absolute bottom-0 left-0 border-b border-l ${tick}`} style={{ width: arm, height: arm }} />
      <span aria-hidden className={`pointer-events-none absolute bottom-0 right-0 border-b border-r ${tick}`} style={{ width: arm, height: arm }} />
      {children}
    </span>
  );
}

type StampTone = 'live' | 'idle' | 'positive' | 'negative' | 'syncing' | 'warning';

/**
 * A stamped status label: a tiny mono uppercase code, optionally with a leading
 * dot, drawn like an inspection stamp rather than a filled pill. One consistent
 * status language across the dashboard (online/stale/today/±/syncing).
 */
export function Stamp({
  children,
  tone = 'idle',
  dot = true,
  className = '',
}: {
  children: React.ReactNode;
  tone?: StampTone;
  dot?: boolean;
  className?: string;
}) {
  const text =
    tone === 'live' || tone === 'positive'
      ? 'text-accent-green-dark'
      : tone === 'negative'
        ? 'text-accent-red-dark'
        : tone === 'warning'
          ? 'text-accent-amber-dark'
          : tone === 'syncing'
            ? 'text-text-secondary'
            : 'text-text-muted';
  const dotColor =
    tone === 'live' || tone === 'positive'
      ? 'bg-accent-green'
      : tone === 'negative'
        ? 'bg-accent-red'
        : tone === 'warning'
          ? 'bg-accent-amber'
          : 'bg-ink-300';

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.16em] ${text} ${className}`}>
      {dot && <span className={`h-1 w-1 rounded-full ${dotColor} ${tone === 'syncing' ? 'animate-pulse' : ''}`} />}
      {children}
    </span>
  );
}

/**
 * The module's archival index header: a fixed semantic code (e.g. CAL) and a
 * data-source label (LOCAL / LIVE / CACHED) on the left, an optional serial /
 * coordinate on the right beside a registration mark — all on one hairline rule.
 * This is the dashboard's signature "filed record" header.
 */
export function SpecHeader({
  code,
  source,
  serial,
  right,
  className = '',
}: {
  /** Fixed module code, e.g. "CAL", "SRV", "WTHR". */
  code: string;
  /** Provenance tag, e.g. "LOCAL", "LIVE", "CACHED". */
  source?: string;
  /** Right-aligned serial / coordinate, e.g. "2026·06". */
  serial?: string;
  /** Extra right-side controls (nav, refresh) rendered after the serial. */
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-border-light pb-2 ${className}`}>
      <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em]">
        <span className="text-text-secondary">{code}</span>
        {source && (
          <>
            <span aria-hidden className="text-text-muted">/</span>
            <span className="text-text-muted">{source}</span>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        {serial && (
          <span className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums tracking-wider text-text-muted">
            <span aria-hidden className="text-text-tertiary">⌖</span>
            {serial}
          </span>
        )}
        {right}
      </div>
    </div>
  );
}

/**
 * One ledger row: a label on the left, a value on the right, baseline-aligned.
 * Inside a {@link SpecRows} group the rows share dotted hairline separators, so
 * a stack of these reads as a single aligned table rather than separate cards.
 */
export function SpecRow({
  label,
  value,
  valueTone = 'primary',
  title,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  valueTone?: 'primary' | 'secondary' | 'accent' | 'warning' | 'danger';
  title?: string;
}) {
  const toneClass =
    valueTone === 'accent'
      ? 'text-accent-green-dark'
      : valueTone === 'warning'
        ? 'text-accent-amber-dark'
        : valueTone === 'danger'
          ? 'text-accent-red-dark'
          : valueTone === 'secondary'
            ? 'text-text-secondary'
            : 'text-text-primary';

  return (
    <div className="flex items-baseline justify-between gap-3 py-1" title={title}>
      <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
        {label}
      </span>
      <span className={`shrink-0 font-mono text-[11px] tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}

/** Groups {@link SpecRow}s with hairline dividers — the ledger body. */
export function SpecRows({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-border-light/70">{children}</div>;
}

/**
 * A compact metric cell for a glanceable grid: tiny mono label above a tabular
 * value, optionally over a hairline-tracked bar. No border — cells sit on a
 * shared column grid and are separated by whitespace + an optional baseline bar.
 */
export function SpecMetric({
  label,
  value,
  bar,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  /** 0–100; when provided a thin progress bar is drawn under the value. */
  bar?: number;
  tone?: 'neutral' | 'ok' | 'warn' | 'crit';
}) {
  const barColor =
    tone === 'crit'
      ? 'bg-accent-red'
      : tone === 'warn'
        ? 'bg-accent-amber'
        : tone === 'ok'
          ? 'bg-accent-green'
          : 'bg-ink-400';

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-1.5">
        <span className="truncate font-mono text-[9px] uppercase tracking-wider text-text-muted">
          {label}
        </span>
        <span className="shrink-0 font-mono text-[11px] tabular-nums font-medium text-text-primary">
          {value}
        </span>
      </div>
      {bar != null && (
        <div className="mt-1.5 h-px w-full bg-border-light">
          <div
            className={`h-px ${barColor} transition-all`}
            style={{ width: `${Math.max(0, Math.min(100, bar))}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * A borderless metadata chip: mono label + tabular value separated by a hairline
 * divider, laid out inline. Replaces bordered "badge" pills. Group several with
 * {@link MetaChipGroup}.
 */
export function MetaChip({
  label,
  value,
  tone = 'neutral',
  title,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'warning';
  title?: string;
}) {
  const valueClass =
    tone === 'accent'
      ? 'text-accent-green-dark'
      : tone === 'warning'
        ? 'text-accent-amber-dark'
        : 'text-text-secondary';

  return (
    <span
      className="inline-flex items-stretch overflow-hidden rounded-[2px] bg-surface-sunken/60"
      title={title}
    >
      <span className="px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <span
        className={`border-l border-border-light px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${valueClass}`}
      >
        {value}
      </span>
    </span>
  );
}

export function MetaChipGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1">{children}</div>;
}

/**
 * The dashboard's one sparkline language: a thin polyline with an optional area
 * fill, drawn on a non-scaling stroke so it stays crisp at any width. Tone maps
 * to the trend's meaning; default ink keeps it quiet.
 */
export function Sparkline({
  values,
  width = 96,
  height = 26,
  tone = 'ink',
  fill = false,
  className = '',
  ariaLabel = 'Trend',
}: {
  values: number[];
  width?: number;
  height?: number;
  tone?: 'ink' | 'accent' | 'up' | 'down';
  fill?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const coords = sparklineCoords(values, width, height);

  const colorClass =
    tone === 'accent'
      ? 'text-accent-green'
      : tone === 'up'
        ? 'text-accent-green-dark'
        : tone === 'down'
          ? 'text-accent-red-dark'
          : 'text-ink-400';

  if (!coords) {
    // Flat baseline so the row keeps its height when there is no series yet.
    return (
      <div className={`flex items-center ${className}`} style={{ height }} aria-hidden>
        <div className="h-px w-full bg-border-light" />
      </div>
    );
  }

  const line = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <div className={`overflow-hidden ${className}`} style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className={`h-full w-full ${colorClass}`}
        aria-label={ariaLabel}
      >
        {fill && <polygon points={area} fill="currentColor" opacity={0.08} />}
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

interface SparkPoint {
  x: number;
  y: number;
}

// Shared sparkline geometry: pads a single value into a flat line, normalizes
// to the box with a 2px vertical inset so the stroke never clips at the edges.
function sparklineCoords(values: number[], width: number, height: number): SparkPoint[] | null {
  const finite = values.map(Number).filter(Number.isFinite);
  if (finite.length === 0) return null;

  const series = finite.length === 1 ? [finite[0], finite[0]] : finite;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const inset = 2;
  const usable = height - inset * 2;
  const xStep = width / (series.length - 1);

  return series.map((value, index) => ({
    x: round(index * xStep),
    y: round(height - inset - ((value - min) / span) * usable),
  }));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
