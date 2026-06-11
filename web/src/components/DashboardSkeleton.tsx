'use client';

import { useEffect, useState, type CSSProperties } from 'react';

const SNAPSHOT_KEY = 'opaque:layout-snapshot';

export interface LayoutSnapshotRow {
  roots: string[];
  widths: number[];
}

// Persisted after each successful dashboard load so the next visit's loading
// frame mirrors the user's actual layout instead of a generic placeholder.
export function saveLayoutSnapshot(rows: LayoutSnapshotRow[]) {
  try {
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(rows));
  } catch {
    // Storage may be unavailable (private mode); the generic skeleton is fine.
  }
}

function readLayoutSnapshot(): LayoutSnapshotRow[] | null {
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const rows = parsed.filter((row): row is LayoutSnapshotRow => (
      Boolean(row)
      && typeof row === 'object'
      && Array.isArray((row as LayoutSnapshotRow).roots)
      && Array.isArray((row as LayoutSnapshotRow).widths)
      && (row as LayoutSnapshotRow).roots.length > 0
    ));
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

const DEFAULT_ROWS: LayoutSnapshotRow[] = [
  { roots: ['bookmarks', 'today'], widths: [50, 50] },
  { roots: ['media', 'applications', 'posts'], widths: [33, 34, 33] },
];

const bar = 'rounded-sm bg-surface-sunken';
const barSoft = 'rounded-sm bg-[#f1f1f1]';

export default function DashboardSkeleton() {
  // Start from the generic frame (matches SSR), then swap to the remembered
  // layout right after mount so the skeleton mirrors the real structure.
  const [rows, setRows] = useState<LayoutSnapshotRow[]>(DEFAULT_ROWS);

  useEffect(() => {
    const snapshot = readLayoutSnapshot();
    if (snapshot) setRows(snapshot);
  }, []);

  return (
    <div className="animate-fade-in py-16">
      <div className="mx-4 md:mx-8">
        <div className="h-0.5 w-6 bg-ink-300" />
        <div className={`mt-3 h-3 w-44 animate-pulse ${barSoft}`} />
      </div>

      <div className="mx-4 mt-8 flex flex-col gap-5 md:mx-8">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid items-start gap-4 md:gap-5"
            style={{
              gridTemplateColumns: row.widths
                .map((width) => `minmax(0, ${Math.max(width, 10)}fr)`)
                .join(' '),
            } as CSSProperties}
          >
            {row.roots.map((root, cellIndex) => (
              <SectionSkeleton key={`${root}-${cellIndex}`} root={root} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionSkeleton({ root }: { root: string }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center gap-3">
        <div className={`h-3.5 w-20 animate-pulse ${bar}`} />
        <div className="h-px flex-1 bg-border-light" />
      </div>
      <SectionBodySkeleton root={root} />
    </section>
  );
}

function SectionBodySkeleton({ root }: { root: string }) {
  if (root === 'today' || root === 'media') {
    return (
      <div className="flex animate-pulse flex-wrap gap-3">
        {[0, 1].map((index) => (
          <div key={index} className="w-72 max-w-full border border-border-light bg-white p-3">
            <div className={`h-3 w-20 ${bar}`} />
            <div className={`mt-4 h-2.5 w-3/4 ${barSoft}`} />
            <div className={`mt-2 h-2.5 w-1/2 ${barSoft}`} />
            <div className={`mt-2 h-2.5 w-2/3 ${barSoft}`} />
            <div className={`mt-4 h-16 w-full ${barSoft}`} />
          </div>
        ))}
      </div>
    );
  }

  if (root === 'posts') {
    return (
      <div className="max-w-[732px] animate-pulse border border-border-light bg-white p-3">
        <div className={`h-3 w-32 ${bar}`} />
        <div className="mt-4 space-y-3.5">
          {[0, 1, 2, 3].map((index) => (
            <div key={index}>
              <div className={`h-2.5 ${bar}`} style={{ width: `${80 - (index % 3) * 12}%` }} />
              <div className={`mt-1.5 h-2 w-2/5 ${barSoft}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (root === 'servers') {
    return (
      <div className="w-[360px] max-w-full animate-pulse border border-border-light bg-white p-4">
        <div className={`h-3 w-28 ${bar}`} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((index) => (
            <div key={index}>
              <div className={`h-2 w-12 ${barSoft}`} />
              <div className={`mt-1.5 h-1.5 w-full ${barSoft}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // bookmarks / applications / fallback: light text rows.
  return (
    <div className="max-w-md animate-pulse space-y-2.5 pt-1">
      <div className={`h-3 w-28 ${bar}`} />
      <div className={`h-2.5 w-3/5 ${barSoft}`} />
      <div className={`h-2.5 w-2/5 ${barSoft}`} />
    </div>
  );
}
