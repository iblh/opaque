import type { Tree } from '@/lib/types';

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
  { roots: ['bookmarks', 'weather'], widths: [50, 50] },
  { roots: ['markets', 'calendar', 'applications'], widths: [33, 34, 33] },
  { roots: ['media', 'posts'], widths: [50, 50] },
];

// A structural-only forest (root names + column widths — no content, no
// secrets) fed to the real DashboardLayoutEditor during the pre-verification
// window, so first paint uses the actual layout DOM; section bodies render as
// skeletons and fill in once verified data arrives, so there is no
// skeleton→layout swap to jitter.
//
// Defaults to a fixed frame so server and client render identically (no
// hydration mismatch). Pass the saved snapshot rows — read after mount via
// readSnapshotRows() — to mirror the user's actual layout.
export function buildSkeletonForest(rows: LayoutSnapshotRow[] = DEFAULT_ROWS): Tree[] {
  const forest: Tree[] = [];
  rows.forEach((row, rowIndex) => {
    const rowId = `skeleton-${rowIndex}`;
    row.roots.forEach((root, colIndex) => {
      forest.push({
        root,
        branches: [],
        layout: {
          rowId,
          rowIndex,
          colIndex,
          widthPct: row.widths[colIndex] ?? 100 / row.roots.length,
        },
      });
    });
  });
  return forest;
}

// The saved layout snapshot rows, or null if none/unavailable. Read after mount
// (it touches localStorage) so the initial render stays deterministic.
export function readSnapshotRows(): LayoutSnapshotRow[] | null {
  return readLayoutSnapshot();
}

const bar = 'rounded-sm bg-surface-sunken';
const barSoft = 'rounded-sm bg-[#f1f1f1]';

// Borderless bodies (matching the live, border-free cards): structure comes
// from spacing alone. Each shape mirrors its real widget so the panel doesn't
// reshape when live data arrives.
export function SectionBodySkeleton({ root }: { root: string }) {
  if (root === 'weather') {
    return (
      <div className="w-full max-w-[320px] animate-pulse">
        <div className={`h-8 w-20 ${bar}`} />
        <div className={`mt-2 h-2.5 w-24 ${barSoft}`} />
        <div className={`mt-4 h-2 w-40 ${barSoft}`} />
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border-light pt-3">
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <div className={`h-2 w-8 ${barSoft}`} />
              <div className={`mt-1.5 h-2.5 w-12 ${bar}`} />
              <div className={`mt-1 h-2 w-10 ${barSoft}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (root === 'markets') {
    return (
      <div className="w-full max-w-[320px] animate-pulse divide-y divide-border-light">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_56px_minmax(4.5rem,auto)] items-center gap-3 py-2.5"
          >
            <div>
              <div className={`h-2.5 w-12 ${bar}`} />
              <div className={`mt-1.5 h-2 w-16 ${barSoft}`} />
            </div>
            <div className={`h-[24px] w-full ${barSoft}`} />
            <div className="justify-self-end">
              <div className={`h-2.5 w-12 ${bar}`} />
              <div className={`mt-1.5 h-2 w-14 ${barSoft}`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (root === 'calendar') {
    return (
      <div className="w-full max-w-[320px] animate-pulse">
        <div className="mb-3 flex items-center justify-between">
          <div className={`h-3 w-16 ${bar}`} />
          <div className={`h-3 w-10 ${barSoft}`} />
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: 42 }).map((_, index) => (
            <div key={index} className="flex justify-center">
              <div className={`h-7 w-7 rounded-sm ${index % 8 === 0 ? bar : barSoft}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (root === 'media') {
    return (
      <div className="w-full max-w-[360px] animate-pulse">
        <div className="mb-4 flex items-baseline justify-between">
          <div className={`h-2 w-12 ${bar}`} />
          <div className={`h-2 w-16 ${barSoft}`} />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex items-baseline justify-between gap-2">
              <div className={`h-2.5 w-16 ${barSoft}`} />
              <div className={`h-2.5 w-8 ${bar}`} />
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-border-light pt-3">
          <div className={`h-2 w-24 ${barSoft}`} />
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className={`aspect-[2/3] ${bar}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (root === 'posts') {
    return (
      <div className="max-w-[732px] animate-pulse space-y-3.5">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index}>
            <div className={`h-2.5 ${bar}`} style={{ width: `${82 - (index % 3) * 14}%` }} />
            <div className={`mt-1.5 h-2 w-2/5 ${barSoft}`} />
          </div>
        ))}
      </div>
    );
  }

  if (root === 'servers') {
    return (
      <div className="w-[360px] max-w-full animate-pulse">
        <div className="grid grid-cols-2 gap-3">
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

  // bookmarks / applications / fallback: a couple of icon + label rows.
  return (
    <div className="max-w-md animate-pulse space-y-3 pt-1">
      {[0, 1].map((index) => (
        <div key={index} className="flex items-center gap-2">
          <div className={`h-[18px] w-[18px] flex-shrink-0 rounded-sm ${barSoft}`} />
          <div className={`h-2.5 ${bar}`} style={{ width: `${50 - index * 12}%` }} />
        </div>
      ))}
    </div>
  );
}
