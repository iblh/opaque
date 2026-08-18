'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import {
  canMoveWithinRegion,
  orderRoots,
  regionFor,
  spanFor,
  type LayoutId,
  type RegionId,
} from '@/lib/layouts';
import { getRootLabel } from '@/lib/modules';
import { ProtoHeading } from '@/components/Tree/protoPrimitives';
import { Tree } from '@/lib/types';

interface PresetLayoutProps {
  layout: LayoutId;
  forest: Tree[];
  renderSection: (tree: Tree) => ReactNode;
  /** Edit mode shows the reorder controls. */
  isEditing?: boolean;
  /** Move a section one step within its own column. */
  onMove?: (root: string, direction: -1 | 1) => void;
}

// Passed by context so the five skeletons stay declarative — they compose
// <Section>, and the controls come along with it.
interface ReorderContext {
  layout: LayoutId;
  forest: Tree[];
  isEditing: boolean;
  onMove?: (root: string, direction: -1 | 1) => void;
}

const ReorderCtx = createContext<ReorderContext | null>(null);

/**
 * Places dashboard sections into the active preset skeleton.
 *
 * This replaces the old drag-grid: the *layout* owns placement now, assigning
 * each section root to a named region (see lib/layouts.ts). Every skeleton
 * consumes the same region vocabulary — lead / main / aside / rail — so adding a
 * section root never breaks a layout, and switching layouts re-flows the same
 * content without touching the stored dashboard.
 */
export default function PresetLayout({
  layout,
  forest,
  renderSection,
  isEditing = false,
  onMove,
}: PresetLayoutProps) {
  const buckets = groupByRegion(layout, forest);
  const skeleton = (() => {
    switch (layout) {
      case 'ledger':
        return <LedgerSkeleton buckets={buckets} renderSection={renderSection} />;
      case 'journal':
        return <JournalSkeleton buckets={buckets} renderSection={renderSection} />;
      case 'bento':
        return <BentoSkeleton buckets={buckets} renderSection={renderSection} />;
      case 'catalog':
        return <CatalogSkeleton buckets={buckets} renderSection={renderSection} />;
      case 'sheet':
      default:
        return <SheetSkeleton buckets={buckets} renderSection={renderSection} />;
    }
  })();

  return (
    <ReorderCtx.Provider value={{ layout, forest, isEditing, onMove }}>
      {skeleton}
    </ReorderCtx.Provider>
  );
}

type RegionBuckets = Record<RegionId, Tree[]>;

function groupByRegion(layout: LayoutId, forest: Tree[]): RegionBuckets {
  const buckets: RegionBuckets = { lead: [], main: [], aside: [], rail: [], full: [] };
  // orderRoots handles precedence: a position the user explicitly saved for this
  // layout wins, otherwise the layout's authored order seeds the composition.
  orderRoots(layout, forest).forEach((tree) => {
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
      <ProtoHeading meta={<ReorderControls root={tree.root} />}>
        {getRootLabel(tree.root)}
      </ProtoHeading>
      {renderSection(tree)}
    </section>
  );
}

/**
 * Move-up / move-down for one section. The layout decides which column a module
 * belongs to, so these only shift it within that column — there is deliberately
 * no affordance for moving a module to a different column.
 */
function ReorderControls({ root }: { root: string }) {
  const ctx = useContext(ReorderCtx);
  if (!ctx?.isEditing || !ctx.onMove) return null;

  const { layout, forest, onMove } = ctx;
  const canUp = canMoveWithinRegion(layout, forest, root, -1);
  const canDown = canMoveWithinRegion(layout, forest, root, 1);
  if (!canUp && !canDown) return null;

  const label = getRootLabel(root);
  return (
    <span className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onMove(root, -1)}
        disabled={!canUp}
        aria-label={`Move ${label} up in its column`}
        className="opaque-icon-button h-5 w-5 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <IconChevronUp className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => onMove(root, 1)}
        disabled={!canDown}
        aria-label={`Move ${label} down in its column`}
        className="opaque-icon-button h-5 w-5 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <IconChevronDown className="h-3 w-3" />
      </button>
    </span>
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
// The vertical rules and faint drop shadow are the point: the content should read
// as a physical sheet laid on the desk, not as a full-bleed web page.
function SheetSkeleton({ buckets, renderSection }: SkeletonProps) {
  return (
    <div className="mx-auto w-full max-w-5xl border-x border-border-light shadow-[0_0_40px_rgba(0,0,0,0.03)]">
      <div className="p-[calc(var(--unit)*8)]">
        <Stack trees={buckets.lead} renderSection={renderSection} className="mb-[calc(var(--unit)*12)]" />
        <div className="grid grid-cols-1 gap-x-[calc(var(--unit)*8)] gap-y-[calc(var(--unit)*12)] lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Stack trees={[...buckets.main, ...buckets.full]} renderSection={renderSection} />
          </div>
          <aside className="lg:col-span-4">
            <Stack trees={[...buckets.aside, ...buckets.rail]} renderSection={renderSection} />
          </aside>
        </div>
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

// M — Bento Grid: hairline-separated tiles on a four-column grid.
//
// Footprints are authored per module (see LAYOUTS.bento.spans) rather than
// derived from position. Rows follow their content instead of using fixed row
// spans, so unpredictable feeds cannot create large empty blocks elsewhere.
function BentoSkeleton({ buckets, renderSection }: SkeletonProps) {
  const tiles = [...buckets.lead, ...buckets.main, ...buckets.aside, ...buckets.rail, ...buckets.full];
  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* A 1px gap over a hairline background makes the cells read as tiles
          separated by rules rather than as bordered cards. */}
      <div className="grid grid-cols-1 gap-px border border-border-light bg-border-light md:grid-flow-row-dense md:grid-cols-4">
        {tiles.map((tree) => {
          const span = spanFor('bento', tree.root);
          // The prototype titles its wide tiles in serif but labels the narrow
          // ones in mono microtype, so the tile's own width decides its register.
          const size = span.includes('col-span-1') ? 'small' : 'wide';
          return (
          <div
            key={tree.root}
            data-section-root={tree.root}
            data-tile={size}
            className={`flex min-w-0 flex-col bg-background p-[calc(var(--unit)*6)] ${span}`}
          >
            <ProtoHeading meta={<ReorderControls root={tree.root} />}>
              {getRootLabel(tree.root)}
            </ProtoHeading>
            {renderSection(tree)}
          </div>
          );
        })}
      </div>
    </div>
  );
}

// X — Catalog: a narrow instrument rail beside two wide catalogue columns.
// Prototype X gives the rail only 2 of 12 columns and splits the rest evenly,
// so the two reading columns carry equal weight.
function CatalogSkeleton({ buckets, renderSection }: SkeletonProps) {
  const gap = 'gap-[calc(var(--unit)*16)]';
  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <Stack trees={buckets.lead} renderSection={renderSection} className="mb-[calc(var(--unit)*16)]" />
      <div className={`grid grid-cols-1 lg:grid-cols-12 ${gap}`}>
        <aside className="space-y-[calc(var(--unit)*16)] lg:col-span-2">
          <Stack
            trees={buckets.rail}
            renderSection={renderSection}
            className="space-y-[calc(var(--unit)*16)]"
          />
        </aside>
        <div className="lg:col-span-5">
          <Stack
            trees={[...buckets.main, ...buckets.full]}
            renderSection={renderSection}
            className="space-y-[calc(var(--unit)*16)]"
          />
        </div>
        <div className="lg:col-span-5">
          <Stack
            trees={buckets.aside}
            renderSection={renderSection}
            className="space-y-[calc(var(--unit)*16)]"
          />
        </div>
      </div>
    </div>
  );
}
