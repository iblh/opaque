'use client';

import { type ReactNode } from 'react';
import { regionFor, type LayoutId, type RegionId } from '@/lib/layouts';
import { getRootLabel } from '@/lib/modules';
import { ProtoHeading } from '@/components/Tree/protoPrimitives';
import { Tree } from '@/lib/types';

interface PresetLayoutProps {
  layout: LayoutId;
  forest: Tree[];
  renderSection: (tree: Tree) => ReactNode;
}

/**
 * Places dashboard sections into the active preset skeleton.
 *
 * This replaces the old drag-grid: the *layout* owns placement now, assigning
 * each section root to a named region (see lib/layouts.ts). Every skeleton
 * consumes the same region vocabulary — lead / main / aside / rail — so adding a
 * section root never breaks a layout, and switching layouts re-flows the same
 * content without touching the stored dashboard.
 */
export default function PresetLayout({ layout, forest, renderSection }: PresetLayoutProps) {
  const buckets = groupByRegion(layout, forest);

  switch (layout) {
    case 'sheet':
      return <SheetSkeleton buckets={buckets} renderSection={renderSection} />;
    case 'ledger':
      return <LedgerSkeleton buckets={buckets} renderSection={renderSection} />;
    case 'journal':
      return <JournalSkeleton buckets={buckets} renderSection={renderSection} />;
    case 'split':
      return <SplitSkeleton buckets={buckets} renderSection={renderSection} />;
    case 'bento':
      return <BentoSkeleton buckets={buckets} renderSection={renderSection} />;
    case 'catalog':
      return <CatalogSkeleton buckets={buckets} renderSection={renderSection} />;
    default:
      return <SheetSkeleton buckets={buckets} renderSection={renderSection} />;
  }
}

type RegionBuckets = Record<RegionId, Tree[]>;

function groupByRegion(layout: LayoutId, forest: Tree[]): RegionBuckets {
  const buckets: RegionBuckets = { lead: [], main: [], aside: [], rail: [], full: [] };
  forest.forEach((tree) => {
    buckets[regionFor(layout, tree.root)].push(tree);
  });
  return buckets;
}

interface SkeletonProps {
  buckets: RegionBuckets;
  renderSection: (tree: Tree) => ReactNode;
}

/** A titled section block — the one wrapper every skeleton composes. */
function Section({
  tree,
  renderSection,
}: {
  tree: Tree;
  renderSection: (tree: Tree) => ReactNode;
}) {
  return (
    <section data-section-root={tree.root} className="min-w-0">
      <ProtoHeading>{getRootLabel(tree.root)}</ProtoHeading>
      {renderSection(tree)}
    </section>
  );
}

function Stack({
  trees,
  renderSection,
  className = 'space-y-[calc(var(--unit)*12)]',
}: {
  trees: Tree[];
  renderSection: (tree: Tree) => ReactNode;
  className?: string;
}) {
  if (trees.length === 0) return null;
  return (
    <div className={className}>
      {trees.map((tree) => (
        <Section key={tree.root} tree={tree} renderSection={renderSection} />
      ))}
    </div>
  );
}

// A — Filed Sheet: a centred document page, main column with a slim side rail.
function SheetSkeleton({ buckets, renderSection }: SkeletonProps) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <Stack trees={buckets.lead} renderSection={renderSection} className="mb-[calc(var(--unit)*12)]" />
      <div className="grid grid-cols-1 gap-[calc(var(--unit)*12)] lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Stack trees={[...buckets.main, ...buckets.full]} renderSection={renderSection} />
        </div>
        <aside className="lg:col-span-4">
          <Stack trees={[...buckets.aside, ...buckets.rail]} renderSection={renderSection} />
        </aside>
      </div>
    </div>
  );
}

// C — Dark Ledger: two dense columns, data-forward.
function LedgerSkeleton({ buckets, renderSection }: SkeletonProps) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <Stack trees={buckets.lead} renderSection={renderSection} className="mb-[calc(var(--unit)*8)]" />
      <div className="grid grid-cols-1 gap-[calc(var(--unit)*10)] md:grid-cols-2">
        <Stack trees={[...buckets.main, ...buckets.full]} renderSection={renderSection} className="space-y-[calc(var(--unit)*8)]" />
        <Stack trees={[...buckets.aside, ...buckets.rail]} renderSection={renderSection} className="space-y-[calc(var(--unit)*8)]" />
      </div>
    </div>
  );
}

// K — Refined Journal: sticky index sidebar beside a wide reading column.
function JournalSkeleton({ buckets, renderSection }: SkeletonProps) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid grid-cols-1 gap-[calc(var(--unit)*14)] lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--unit)*6)]">
            <Stack trees={[...buckets.lead, ...buckets.aside, ...buckets.rail]} renderSection={renderSection} />
          </div>
        </aside>
        <div className="lg:col-span-8">
          <Stack trees={[...buckets.main, ...buckets.full]} renderSection={renderSection} />
        </div>
      </div>
    </div>
  );
}

// AB — Split Category: sticky aside with a category-grouped directory grid.
function SplitSkeleton({ buckets, renderSection }: SkeletonProps) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid grid-cols-1 gap-[calc(var(--unit)*14)] lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--unit)*6)]">
            <Stack trees={[...buckets.lead, ...buckets.aside, ...buckets.rail]} renderSection={renderSection} />
          </div>
        </aside>
        <div className="lg:col-span-8">
          {/* The directory splits into two category columns at width. */}
          <div className="grid grid-cols-1 gap-x-[calc(var(--unit)*10)] gap-y-[calc(var(--unit)*12)] xl:grid-cols-2">
            {[...buckets.main, ...buckets.full].map((tree) => (
              <Section key={tree.root} tree={tree} renderSection={renderSection} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// M — Bento Grid: hairline-separated tiles on an even four-column grid.
function BentoSkeleton({ buckets, renderSection }: SkeletonProps) {
  const tiles = [...buckets.lead, ...buckets.main, ...buckets.aside, ...buckets.rail, ...buckets.full];
  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* A 1px gap over a hairline background makes the cells read as tiles
          separated by rules rather than as bordered cards. */}
      <div className="grid grid-cols-1 gap-px border border-border-light bg-border-light md:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tree, index) => (
          <div
            key={tree.root}
            data-section-root={tree.root}
            className={`min-w-0 bg-background p-[calc(var(--unit)*6)] ${bentoSpan(index)}`}
          >
            <ProtoHeading>{getRootLabel(tree.root)}</ProtoHeading>
            {renderSection(tree)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Give the first tile extra presence and let wide content breathe, so the grid
// reads as a composed bento rather than uniform boxes.
function bentoSpan(index: number): string {
  if (index === 0) return 'xl:col-span-2 xl:row-span-2';
  if (index === 3) return 'xl:col-span-2';
  return '';
}

// X — Catalog: three columns on a wide canvas.
function CatalogSkeleton({ buckets, renderSection }: SkeletonProps) {
  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <Stack trees={buckets.lead} renderSection={renderSection} className="mb-[calc(var(--unit)*12)]" />
      <div className="grid grid-cols-1 gap-[calc(var(--unit)*12)] lg:grid-cols-12">
        <div className="lg:col-span-3">
          <Stack trees={buckets.rail} renderSection={renderSection} />
        </div>
        <div className="lg:col-span-5">
          <Stack trees={[...buckets.main, ...buckets.full]} renderSection={renderSection} />
        </div>
        <div className="lg:col-span-4">
          <Stack trees={buckets.aside} renderSection={renderSection} />
        </div>
      </div>
    </div>
  );
}
