import React from 'react';

// ---------------------------------------------------------------------------
// Prototype element vocabulary.
//
// The visual language from opaque-design-prototypes: italic serif section heads
// sitting on a solid rule, mono microtype for every label and datum, hairline
// row separators, and a bare status dot (sage = good, terracotta = bad) instead
// of a stamped badge. Colours go through the semantic tokens so both colour
// modes follow.
// ---------------------------------------------------------------------------

/**
 * A section head: italic serif title on a solid rule, with an optional mono
 * caption tucked to the right. This is the single header treatment every module
 * uses — it replaces the archival SpecHeader's code/meta construct.
 */
export function ProtoHeading({
  children,
  meta,
  className = '',
}: {
  children: React.ReactNode;
  /** Small right-aligned mono caption, e.g. a count or provenance. */
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`mb-[calc(var(--unit)*3)] flex items-baseline justify-between gap-3 border-b border-text-primary pb-1 font-serif text-base italic text-text-primary ${className}`}
    >
      <span className="min-w-0 truncate">{children}</span>
      {meta != null && (
        <span className="shrink-0 font-mono text-[9px] uppercase not-italic tracking-widest text-text-muted">
          {meta}
        </span>
      )}
    </h2>
  );
}

/**
 * The status dot. Prototypes express state as a bare 6px dot rather than a
 * lettered badge — sage for healthy/positive, terracotta for down/negative.
 */
export function ProtoDot({
  ok,
  className = '',
  title,
}: {
  ok: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
        ok ? 'bg-accent-green' : 'bg-accent-red'
      } ${className}`}
    />
  );
}

/**
 * One hairline-separated data row with a hover tint — the prototypes' list idiom
 * (applications, markets, bookmarks all use it).
 */
export function ProtoRow({
  children,
  className = '',
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Adds the hover tint used for clickable rows. */
  interactive?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-b border-border-light pb-1 font-mono text-[10px] ${
        interactive ? 'cursor-pointer transition-colors hover:bg-text-primary/[0.04]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** A tiny uppercase mono label — the prototypes' caption microtype. */
export function ProtoLabel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`font-mono text-[9px] uppercase tracking-widest text-text-muted ${className}`}>
      {children}
    </span>
  );
}

/**
 * A signed figure tinted by direction — sage up, terracotta down. Used for
 * market deltas and any other +/- value.
 */
export function ProtoDelta({
  value,
  format,
  className = '',
}: {
  value: number;
  /** Renders the number; defaults to a signed 2-dp percentage. */
  format?: (value: number) => string;
  className?: string;
}) {
  const up = value >= 0;
  const text = format ? format(value) : `${up ? '+' : ''}${value.toFixed(2)}%`;
  return (
    <span
      className={`font-mono tabular-nums ${up ? 'text-accent-green' : 'text-accent-red'} ${className}`}
    >
      {text}
    </span>
  );
}

/**
 * A ledger table — the prototypes' server telemetry idiom. Columns are declared
 * once and both the head and the rows share them, so everything stays aligned.
 */
// Span classes are listed as literals so Tailwind's JIT can see them — building
// `col-span-${n}` dynamically would emit classes that never get generated.
export const COL_SPAN: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
};

export interface LedgerColumn {
  key: string;
  label: string;
  span: number;
  align?: 'left' | 'right';
}

export function ProtoLedger({
  columns,
  children,
}: {
  columns: LedgerColumn[];
  children: React.ReactNode;
}) {
  return (
    <div className="font-mono text-[10px]">
      <div className="mb-2 grid grid-cols-12 border-b-2 border-border-medium pb-2 text-[9px] uppercase tracking-widest text-text-muted">
        {columns.map((column) => (
          <div
            key={column.key}
            className={`${COL_SPAN[column.span]} ${column.align === 'right' ? 'text-right' : ''}`}
          >
            {column.label}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

/** One row inside a {@link ProtoLedger}. */
export function ProtoLedgerRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 items-center border-b border-border-light py-2 transition-colors hover:bg-text-primary/[0.02]">
      {children}
    </div>
  );
}
