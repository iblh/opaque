'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { IconGripVertical } from '@tabler/icons-react';
import {
  DashboardLayoutRow,
  LayoutDropTarget,
  RowDropEdge,
  applyLayoutDrop,
  assignTreeToNewRow,
  getLayoutRows,
  getRowGridTemplate,
  getUnassignedTrees,
  resizeColumn,
  MIN_COLUMN_PCT,
} from '@/lib/dashboardLayout';
import { getRootLabel } from '@/lib/modules';
import { Tree } from '@/lib/types';

// Movement (px) before a press on the grip becomes a drag — keeps clicks clean.
const DRAG_START_THRESHOLD = 4;
// Half-thickness (px) of the "new row" gap band centered on each row boundary.
// Cursor within ±this of a boundary → new-row; deeper inside a row → merge.
const NEW_ROW_BAND = 22;
// Extra distance (px) the cursor must travel past a band edge before the target
// type flips. A directional buffer that prevents jitter near the boundary.
const SWITCH_BUFFER = 10;
// The drag clone caps its width here; a full-width section becomes a tidy card
// instead of a screen-wide slab. Height still follows the source body height.
const MAX_CLONE_WIDTH = 360;
// How many skeleton blocks the clone draws at most (one per branch, capped).
const MAX_CLONE_SKELETON_BLOCKS = 4;

interface GeomCell {
  root: string;
  colIndex: number;
  left: number;
  right: number;
}

interface GeomRow {
  rowId: string;
  top: number;
  bottom: number;
  cells: GeomCell[];
}

// Row boundaries and cell rects in page coordinates (viewport + scroll), so the
// snapshot stays valid even if the user scrolls mid-drag.
interface LayoutGeometry {
  rows: GeomRow[];
}

function captureGeometry(container: HTMLElement): LayoutGeometry {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const rowEls = [...container.querySelectorAll('[data-layout-row]')];
  const rows: GeomRow[] = rowEls.map((rowEl) => {
    const rowRect = rowEl.getBoundingClientRect();
    const cellEls = [...rowEl.querySelectorAll('[data-section-root]')];
    const cells: GeomCell[] = cellEls.map((cellEl) => {
      const rect = cellEl.getBoundingClientRect();
      return {
        root: cellEl.getAttribute('data-section-root') || '',
        colIndex: Number(cellEl.getAttribute('data-col-index') || '0'),
        left: rect.left + scrollX,
        right: rect.right + scrollX,
      };
    });
    return {
      rowId: (rowEl.getAttribute('data-row-id') || ''),
      top: rowRect.top + scrollY,
      bottom: rowRect.bottom + scrollY,
      cells: cells.sort((a, b) => a.colIndex - b.colIndex),
    };
  });
  return { rows };
}

interface DashboardLayoutEditorProps {
  forest: Tree[];
  isEditing: boolean;
  onForestChange: (forest: Tree[]) => void;
  renderSection: (tree: Tree) => ReactNode;
}

interface ResizeState {
  rowId: string;
  leftColIndex: number;
  rowElement: HTMLElement;
  startClientX: number;
  startLeftPct: number;
  startPairPct: number;
  hintText: string;
}

interface DragState {
  root: string;
  label: string;
  // Pointer offset within the clone (already adjusted for the clamped width so
  // the grab point tracks the cursor naturally).
  pointerOffsetX: number;
  pointerOffsetY: number;
  // Clone size: width is clamped to MAX_CLONE_WIDTH, height follows the body.
  width: number;
  height: number;
  // Height of just the section body, so the placeholder reserves the same space.
  bodyHeight: number;
  // Number of branches in the dragged section — drives the skeleton block count.
  branchCount: number;
  // Current pointer position (viewport coords) for the floating clone.
  clientX: number;
  clientY: number;
}

export default function DashboardLayoutEditor({
  forest,
  isEditing,
  onForestChange,
  renderSection,
}: DashboardLayoutEditorProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<LayoutDropTarget | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // While dragging, render the *result* of the pending drop so the layout
  // reflows live to exactly what releasing would commit. The dragged section
  // is shown as a placeholder in that target position.
  //
  // Exception: row-edge (new-row) targets are previewed with a slim highlighted
  // rail between rows instead of reflowing the whole layout — so section heights
  // stay put and the cursor can sweep across a rail to reach the row beyond it.
  const previewForest = useMemo(() => {
    if (!drag || !dropTarget) return forest;
    if (dropTarget.kind === 'row-edge') return forest;
    return applyLayoutDrop(forest, drag.root, dropTarget);
  }, [forest, drag, dropTarget]);

  const rows = useMemo(() => getLayoutRows(previewForest), [previewForest]);
  const unassigned = useMemo(() => getUnassignedTrees(previewForest), [previewForest]);

  // Refs the global pointer handlers read without re-subscribing every render.
  const dragRef = useRef<DragState | null>(null);
  const dropTargetRef = useRef<LayoutDropTarget | null>(null);
  const pendingStart = useRef<
    | {
        root: string;
        label: string;
        rect: DOMRect;
        bodyHeight: number;
        branchCount: number;
        startX: number;
        startY: number;
      }
    | null
  >(null);
  const bootstrapRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Stable geometry of the layout, captured once when the drag activates (rails
  // present, no merge preview yet). Hit-testing reads this — never the live,
  // reflowing preview DOM — so the merge preview can't feed back into the drop
  // decision and cause oscillation.
  const geomRef = useRef<LayoutGeometry | null>(null);
  dragRef.current = drag;
  dropTargetRef.current = dropTarget;

  // Capture geometry synchronously when a drag begins, before the user can move
  // far enough to change the target. At this first paint dropTarget is still
  // null, so the layout shows the stable "drag active, no merge" baseline.
  useLayoutEffect(() => {
    if (drag && !geomRef.current && containerRef.current) {
      geomRef.current = captureGeometry(containerRef.current);
    }
  }, [drag]);

  useEffect(() => {
    if (!isEditing) {
      setDrag(null);
      setDropTarget(null);
      pendingStart.current = null;
      geomRef.current = null;
    }
  }, [isEditing]);

  // ---- Column resize (pointer based) --------------------------------------
  useEffect(() => {
    if (!resize) return;

    const handlePointerMove = (event: PointerEvent) => {
      const rowRect = resize.rowElement.getBoundingClientRect();
      if (rowRect.width <= 0) return;
      const deltaPct = ((event.clientX - resize.startClientX) / rowRect.width) * 100;
      const nextLeft = clamp(
        resize.startLeftPct + deltaPct,
        MIN_COLUMN_PCT,
        resize.startPairPct - MIN_COLUMN_PCT,
      );
      const nextRight = resize.startPairPct - nextLeft;
      const hintText = `${Math.round(nextLeft)}% · ${Math.round(nextRight)}%`;
      setResize((current) => (current ? { ...current, hintText } : current));
      onForestChange(resizeColumn(forest, resize.rowId, resize.leftColIndex, nextLeft));
    };

    const handlePointerUp = () => setResize(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [resize, forest, onForestChange]);

  const startResize = (
    event: ReactPointerEvent<HTMLDivElement>,
    rowId: string,
    leftColIndex: number,
  ) => {
    const rowElement = event.currentTarget.closest('[data-layout-row]');
    if (!(rowElement instanceof HTMLElement)) return;
    const row = rows.find((r) => r.rowId === rowId);
    if (!row) return;
    const left = row.cells[leftColIndex];
    const right = row.cells[leftColIndex + 1];
    if (!left || !right) return;

    event.preventDefault();
    setResize({
      rowId,
      leftColIndex,
      rowElement,
      startClientX: event.clientX,
      startLeftPct: left.widthPct,
      startPairPct: left.widthPct + right.widthPct,
      hintText: `${Math.round(left.widthPct)}% · ${Math.round(right.widthPct)}%`,
    });
  };

  // ---- Section drag (pointer based) ---------------------------------------
  // Decide the drop target from the cursor position against a *stable* geometry
  // snapshot of the committed layout (captured at drag start), never from the
  // live reflowing DOM. This is what removes the row-edge ↔ cell-edge
  // oscillation: the merge preview can shift the visible layout, but it can't
  // change the geometry the decision is based on.
  const computeDropTarget = useCallback((clientX: number, clientY: number): LayoutDropTarget | null => {
    const active = dragRef.current;
    const geom = geomRef.current;
    if (!active || !geom || geom.rows.length === 0) return dropTargetRef.current;

    // Unassigned tray is a small static target; the DOM hit-test is fine here.
    const el = document.elementFromPoint(clientX, clientY);
    if (el?.closest('[data-unassigned-tray]')) return { kind: 'unassign' };

    const x = clientX + window.scrollX;
    const y = clientY + window.scrollY;
    const rows = geom.rows;
    const prev = dropTargetRef.current;

    // Find the row whose vertical span contains y (or the nearest one).
    let rowIndex = rows.findIndex((r) => y >= r.top && y <= r.bottom);
    if (rowIndex === -1) {
      // Above the first row, below the last, or in a gap between rows.
      if (y < rows[0].top) {
        rowIndex = 0;
      } else if (y > rows[rows.length - 1].bottom) {
        rowIndex = rows.length - 1;
      } else {
        // In a gap: attach to the nearer of the two rows bracketing y.
        const upper = [...rows].reverse().find((r) => r.bottom < y);
        rowIndex = upper ? rows.indexOf(upper) : 0;
      }
    }
    const row = rows[rowIndex];

    // Distance from the row's top/bottom edges. Inside the NEW_ROW_BAND of an
    // edge → a new-row drop on that side; deeper inside → merge into this row.
    const distTop = y - row.top;
    const distBottom = row.bottom - y;
    const nearTop = distTop <= NEW_ROW_BAND;
    const nearBottom = distBottom <= NEW_ROW_BAND;

    // Build the geometric candidate.
    let candidate: LayoutDropTarget;
    const isOwnSoloRow = row.cells.length === 1 && row.cells[0]?.root === active.root;
    if (isOwnSoloRow) return null;

    if (nearTop && (!nearBottom || distTop <= distBottom)) {
      candidate = { kind: 'row-edge', rowId: row.rowId, edge: 'top' };
    } else if (nearBottom) {
      candidate = { kind: 'row-edge', rowId: row.rowId, edge: 'bottom' };
    } else {
      // Merge into this row: pick the cell under x (clamped) and the near side.
      const cells = row.cells.filter((c) => c.root !== active.root);
      if (cells.length === 0) return null;
      let cell = cells.find((c) => x >= c.left && x <= c.right);
      if (!cell) cell = x < cells[0].left ? cells[0] : cells[cells.length - 1];
      const mid = (cell.left + cell.right) / 2;
      candidate = {
        kind: 'cell-edge',
        rowId: row.rowId,
        colIndex: cells.indexOf(cell),
        edge: x >= mid ? 'right' : 'left',
      };
    }

    if (sameTarget(prev, candidate)) return prev;

    // Directional hysteresis between *kinds*: switching merge↔new-row requires
    // the cursor to be clearly past the band edge, not just barely over it. This
    // stops flips when the cursor sits right on the boundary.
    if (prev && prev.kind !== candidate.kind) {
      const intoNewRow = candidate.kind === 'row-edge';
      const edgeDist = candidate.kind === 'row-edge'
        ? (candidate.edge === 'top' ? distTop : distBottom)
        : Math.min(distTop, distBottom);
      if (intoNewRow) {
        // Becoming a new-row target: require being well inside the band.
        if (edgeDist > NEW_ROW_BAND - SWITCH_BUFFER) return prev;
      } else {
        // Becoming a merge target: require being well past the band.
        if (edgeDist < NEW_ROW_BAND + SWITCH_BUFFER) return prev;
      }
    }

    return candidate;
  }, []);

  // Once a drag is live, this effect owns the move/up/cancel handling.
  useEffect(() => {
    if (!drag) return;

    const handleMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      event.preventDefault();

      const nextTarget = computeDropTarget(event.clientX, event.clientY);
      if (!sameTarget(nextTarget, dropTargetRef.current)) {
        dropTargetRef.current = nextTarget;
        setDropTarget(nextTarget);
      }
      setDrag((current) => (
        current ? { ...current, clientX: event.clientX, clientY: event.clientY } : current
      ));
    };

    const finish = (commit: boolean) => {
      const active = dragRef.current;
      const target = dropTargetRef.current;
      if (commit && active && target) {
        onForestChange(applyLayoutDrop(forest, active.root, target));
      }
      pendingStart.current = null;
      geomRef.current = null;
      dragRef.current = null;
      dropTargetRef.current = null;
      setDrag(null);
      setDropTarget(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    const handleUp = () => finish(true);
    const handleCancel = () => finish(false);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      window.removeEventListener('keydown', handleKey);
    };
  }, [drag, forest, onForestChange, computeDropTarget]);

  // A press on a grip records a pending drag and attaches a one-shot bootstrap
  // listener. The drag only "activates" once the pointer crosses the movement
  // threshold — so a plain click never starts a drag.
  const beginPress = (event: ReactPointerEvent<HTMLElement>, root: string, label: string) => {
    if (event.button !== 0) return;
    const section = event.currentTarget.closest('[data-section-root]');
    if (!(section instanceof HTMLElement)) return;
    event.preventDefault();
    const bodyEl = section.querySelector('[data-section-body]');
    const bodyHeight = bodyEl instanceof HTMLElement
      ? bodyEl.getBoundingClientRect().height
      : section.getBoundingClientRect().height;
    const branchCount = forest.find((tree) => tree.root === root)?.branches.length ?? 0;
    pendingStart.current = {
      root,
      label,
      rect: section.getBoundingClientRect(),
      bodyHeight,
      branchCount,
      startX: event.clientX,
      startY: event.clientY,
    };
    if (bootstrapRef.current) return;
    bootstrapRef.current = true;

    const onMove = (moveEvent: PointerEvent) => {
      const pending = pendingStart.current;
      if (!pending || dragRef.current) return;
      const dist = Math.hypot(moveEvent.clientX - pending.startX, moveEvent.clientY - pending.startY);
      if (dist < DRAG_START_THRESHOLD) return;
      const sourceWidth = pending.rect.width;
      const cloneWidth = Math.min(sourceWidth, MAX_CLONE_WIDTH);
      const widthScale = sourceWidth > 0 ? cloneWidth / sourceWidth : 1;
      // Height follows the source body, but never taller than the skeleton's
      // natural height so a tall section doesn't stretch a few blocks apart.
      const blocks = Math.max(1, Math.min(pending.branchCount || 1, MAX_CLONE_SKELETON_BLOCKS));
      const HEADER = 37; // header row + border
      const PADDING = 24; // body padding (p-3 top+bottom)
      const BLOCK = 28; // one skeleton block
      const GAP = 10; // gap between blocks
      const naturalHeight = HEADER + PADDING + blocks * BLOCK + Math.max(0, blocks - 1) * GAP;
      const cloneHeight = Math.min(pending.bodyHeight + HEADER, naturalHeight);
      const next: DragState = {
        root: pending.root,
        label: pending.label,
        // Scale the horizontal grab point to the clamped width; clamp the
        // vertical offset so the cursor always rests on the (shorter) clone.
        pointerOffsetX: (pending.startX - pending.rect.left) * widthScale,
        pointerOffsetY: Math.min(pending.startY - pending.rect.top, cloneHeight - 16),
        width: cloneWidth,
        height: cloneHeight,
        bodyHeight: pending.bodyHeight,
        branchCount: pending.branchCount,
        clientX: moveEvent.clientX,
        clientY: moveEvent.clientY,
      };
      dragRef.current = next;
      setDrag(next);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      teardown();
    };
    const onUp = () => {
      pendingStart.current = null;
      teardown();
    };
    const teardown = () => {
      bootstrapRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const isDragActive = Boolean(drag);
  const activeRowEdge = dropTarget?.kind === 'row-edge' ? dropTarget : null;

  return (
    <div
      ref={containerRef}
      data-layout-editor
      data-drafting={isDragActive ? 'true' : undefined}
      className="drafting-surface mx-6 flex flex-col gap-10 sm:mx-8 md:gap-12 lg:mx-12 xl:mx-16 xl:gap-14 2xl:mx-24"
    >
      {rows.map((row, rowIndex) => (
        <LayoutRow
          key={row.rowId}
          row={row}
          rowIndex={rowIndex}
          isEditing={isEditing}
          renderSection={renderSection}
          draggingRoot={drag?.root ?? null}
          dragHeight={drag?.bodyHeight ?? null}
          isDragActive={isDragActive}
          newRowEdge={
            activeRowEdge?.rowId === row.rowId ? activeRowEdge.edge : null
          }
          resize={resize}
          onGripPointerDown={beginPress}
          onResizeStart={startResize}
        />
      ))}

      {isEditing && (
        <UnassignedTray
          unassigned={unassigned}
          draggingRoot={drag?.root ?? null}
          isHover={dropTarget?.kind === 'unassign'}
          onForestChange={onForestChange}
          forest={forest}
          onGripPointerDown={beginPress}
        />
      )}

      {mounted && drag && createPortal(
        <DragClone drag={drag} />,
        document.body,
      )}
    </div>
  );
}

// A "new row" indicator line drawn into the gap above or below a row while
// dragging, when that row boundary is the active drop target. It is absolutely
// positioned so it never affects layout (no gap toggling, no reflow), which —
// together with geometry-based hit-testing — keeps the interaction smooth.
function NewRowIndicator({ edge }: { edge: RowDropEdge }) {
  const position = edge === 'top' ? '-top-2.5' : '-bottom-2.5';
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${position} left-0 right-0 flex items-center`}
    >
      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent-green" />
      <span className="h-[2px] flex-1 bg-accent-green" />
      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent-green" />
    </div>
  );
}

interface LayoutRowProps {
  row: DashboardLayoutRow;
  rowIndex: number;
  isEditing: boolean;
  renderSection: (tree: Tree) => ReactNode;
  draggingRoot: string | null;
  dragHeight: number | null;
  isDragActive: boolean;
  newRowEdge: RowDropEdge | null;
  resize: ResizeState | null;
  onGripPointerDown: (event: ReactPointerEvent<HTMLElement>, root: string, label: string) => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>, rowId: string, leftColIndex: number) => void;
}

function LayoutRow({
  row,
  rowIndex,
  isEditing,
  renderSection,
  draggingRoot,
  dragHeight,
  isDragActive,
  newRowEdge,
  resize,
  onGripPointerDown,
  onResizeStart,
}: LayoutRowProps) {
  const gridTemplateColumns = useMemo(() => getRowGridTemplate(row), [row]);
  const activeResize = resize?.rowId === row.rowId ? resize : null;
  // Resize affordances only make sense when not mid-drag and the row has a seam.
  const showGutters = isEditing && !isDragActive && row.cells.length > 1;

  return (
    <div
      data-layout-row
      data-row-id={row.rowId}
      className="relative [--row-gap:1.25rem] md:[--row-gap:1.5rem] xl:[--row-gap:2rem]"
    >
      {newRowEdge && <NewRowIndicator edge={newRowEdge} />}
      <div
        className="grid items-start transition-[grid-template-columns]"
        style={{ gridTemplateColumns, columnGap: 'var(--row-gap)', rowGap: 'var(--row-gap)' } as CSSProperties}
      >
        {row.cells.map((cell, colIndex) => {
          const isPlaceholder = draggingRoot === cell.tree.root;

          return (
            <div
              key={cell.tree.root}
              data-section-root={cell.tree.root}
              data-col-index={colIndex}
              className="relative min-w-0"
            >
              <SectionHeader
                tree={cell.tree}
                isEditing={isEditing}
                isPlaceholder={isPlaceholder}
                coordinate={`${String.fromCharCode(65 + colIndex)}:${rowIndex + 1}`}
                onGripPointerDown={onGripPointerDown}
              />

              {isPlaceholder ? (
                <PlaceholderBody
                  label={getRootLabel(cell.tree.root)}
                  height={dragHeight}
                />
              ) : (
                <div data-section-body>{renderSection(cell.tree)}</div>
              )}
            </div>
          );
        })}
      </div>

      {showGutters && (
        <div
          className="pointer-events-none absolute inset-0 grid items-stretch"
          style={{ gridTemplateColumns, columnGap: 'var(--row-gap)' } as CSSProperties}
        >
          {row.cells.slice(0, -1).map((_, leftColIndex) => (
            <ResizeGutter
              key={`gutter-${leftColIndex}`}
              column={leftColIndex + 1}
              isActive={activeResize?.leftColIndex === leftColIndex}
              hintText={activeResize?.leftColIndex === leftColIndex ? activeResize.hintText : null}
              onPointerDown={(event) => onResizeStart(event, row.rowId, leftColIndex)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SectionHeaderProps {
  tree: Tree;
  isEditing: boolean;
  isPlaceholder: boolean;
  /** Drafting coordinate (e.g. "A:2") shown by the grip in edit mode. */
  coordinate?: string;
  onGripPointerDown: (event: ReactPointerEvent<HTMLElement>, root: string, label: string) => void;
}

function SectionHeader({ tree, isEditing, isPlaceholder, coordinate, onGripPointerDown }: SectionHeaderProps) {
  const label = getRootLabel(tree.root);
  return (
    <div className={`mb-6 flex items-center gap-2.5 transition-opacity ${isPlaceholder ? 'opacity-30' : ''}`}>
      {isEditing && (
        <>
          {/* Drafting coordinate — a small mono grid reference, like a plate
              number on a technical sheet. */}
          {coordinate && (
            <span className="select-none font-mono text-[9px] tabular-nums tracking-wider text-text-muted/70">
              {coordinate}
            </span>
          )}
          <button
            type="button"
            onPointerDown={(event) => onGripPointerDown(event, tree.root, label)}
            className="inline-flex h-5 w-5 cursor-grab touch-none items-center justify-center text-text-muted transition-colors hover:text-text-primary active:cursor-grabbing"
            aria-label={`Drag ${label} section`}
            title="Drag to rearrange"
          >
            <IconGripVertical className="h-3.5 w-3.5" />
          </button>
        </>
      )}
      <div className="font-serif text-base leading-none text-text-secondary">
        {label}
      </div>
    </div>
  );
}

function PlaceholderBody({ label, height }: { label: string; height: number | null }) {
  // Reserve the dragged section's original body height so the surrounding
  // layout barely shifts while the section is lifted out.
  const style: CSSProperties = height
    ? { height }
    : { minHeight: '4.5rem' };

  return (
    <div
      style={style}
      className="flex items-center justify-center rounded-sm border border-dashed border-border-strong bg-surface-sunken/40"
    >
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
        {label}
      </span>
    </div>
  );
}

function DragClone({ drag }: { drag: DragState }) {
  // A clean skeleton card that follows the cursor: the section header plus a
  // few abstracted "content" blocks (one per branch, capped). It keeps the
  // source's height for a sense of mass but caps its width so a full-width
  // section becomes a tidy card rather than a screen-wide slab.
  const style: CSSProperties = {
    position: 'fixed',
    left: drag.clientX - drag.pointerOffsetX,
    top: drag.clientY - drag.pointerOffsetY,
    width: drag.width,
    height: drag.height,
    transform: 'scale(1.02)',
    transformOrigin: 'top left',
    pointerEvents: 'none',
    zIndex: 60,
  };

  const blockCount = Math.max(1, Math.min(drag.branchCount || 1, MAX_CLONE_SKELETON_BLOCKS));

  return (
    // data-overlay: a drag is in progress and owns Escape (cancels the drag);
    // the global Escape shortcut must not also discard the whole draft.
    <div style={style} data-overlay className="opaque-drag-clone">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-border-medium bg-surface-elevated shadow-floating">
        <div className="flex items-center gap-2 border-b border-border-light px-3 py-2">
          <IconGripVertical className="h-3.5 w-3.5 text-text-muted" />
          <span className="truncate text-xs font-medium uppercase tracking-wider text-text-secondary">
            {drag.label}
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-3">
          {Array.from({ length: blockCount }, (_, index) => (
            <SkeletonBlock key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-7 w-7 flex-shrink-0 rounded-sm bg-surface-sunken" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="h-2 w-1/2 rounded-full bg-surface-sunken" />
        <div className="h-2 w-3/4 rounded-full bg-border-light" />
      </div>
    </div>
  );
}

interface ResizeGutterProps {
  column: number;
  isActive: boolean;
  hintText: string | null;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

function ResizeGutter({ column, isActive, hintText, onPointerDown }: ResizeGutterProps) {
  // The gutter is a zero-width marker pinned to the *end* of the left column
  // (justify-self:end). The grid gap (--row-gap) sits immediately to its right,
  // so the visual seam center is half a gap to the right of the origin — we
  // place the hit area and divider line there so the handle lands on the seam.
  return (
    <div
      className="relative h-full"
      style={{ gridColumn: column, justifySelf: 'end', width: 0 }}
    >
      <div
        className={`pointer-events-auto absolute top-8 bottom-0 w-6 cursor-col-resize touch-none ${isActive ? '' : 'group/gutter'}`}
        style={{ left: 'calc((var(--row-gap) / 2) - 0.75rem)' }}
        onPointerDown={onPointerDown}
        role="separator"
        aria-orientation="vertical"
      >
        {/* Persistent faint seam line (edit mode), stronger on hover / active. */}
        <div
          className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px transition-colors ${
            isActive
              ? 'bg-text-primary'
              : 'bg-border-medium group-hover/gutter:bg-text-secondary'
          }`}
        />
        {/* Grip pill. Faint at rest, solid on hover / active. */}
        <div
          className={`absolute top-1/2 left-1/2 flex h-6 w-2.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-surface-elevated transition-all ${
            isActive
              ? 'border-text-primary opacity-100'
              : 'border-border-medium opacity-60 group-hover/gutter:border-text-secondary group-hover/gutter:opacity-100'
          }`}
        >
          <span className="flex flex-col gap-[2px]">
            <span className="block h-[3px] w-[3px] rounded-full bg-text-tertiary" />
            <span className="block h-[3px] w-[3px] rounded-full bg-text-tertiary" />
          </span>
        </div>
        {isActive && hintText && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[calc(50%+1.25rem)] whitespace-nowrap rounded-sm border border-border-light bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] tracking-tight text-text-secondary shadow-subtle">
            {hintText}
          </div>
        )}
      </div>
    </div>
  );
}

interface UnassignedTrayProps {
  unassigned: Tree[];
  forest: Tree[];
  draggingRoot: string | null;
  isHover: boolean;
  onForestChange: (forest: Tree[]) => void;
  onGripPointerDown: (event: ReactPointerEvent<HTMLElement>, root: string, label: string) => void;
}

function UnassignedTray({
  unassigned,
  forest,
  draggingRoot,
  isHover,
  onForestChange,
  onGripPointerDown,
}: UnassignedTrayProps) {
  return (
    <div
      data-unassigned-tray
      className={`mt-2 border-t pt-4 transition-colors ${isHover ? 'border-text-primary' : 'border-border-light'}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
          Hidden
        </span>
        {unassigned.length === 0 ? (
          <span className="text-[11px] text-text-muted">
            Drag a section here to hide it from the dashboard.
          </span>
        ) : (
          unassigned.map((tree) => {
            const label = getRootLabel(tree.root);
            return (
              <button
                key={tree.root}
                type="button"
                data-section-root={tree.root}
                data-col-index={0}
                onPointerDown={(event) => onGripPointerDown(event, tree.root, label)}
                onClick={() => onForestChange(assignTreeToNewRow(forest, tree.root))}
                className={`inline-flex cursor-grab touch-none items-center gap-1.5 border border-border-light bg-surface-elevated px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-medium hover:text-text-primary active:cursor-grabbing ${draggingRoot === tree.root ? 'opacity-40' : ''}`}
                title="Drag onto the dashboard, or click to add a new row"
              >
                <IconGripVertical className="h-3 w-3 text-text-muted" />
                {label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function sameTarget(a: LayoutDropTarget | null, b: LayoutDropTarget | null) {
  if (a === b) return true;
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === 'row-edge' && b.kind === 'row-edge') {
    return a.rowId === b.rowId && a.edge === b.edge;
  }
  if (a.kind === 'cell-edge' && b.kind === 'cell-edge') {
    return a.rowId === b.rowId && a.colIndex === b.colIndex && a.edge === b.edge;
  }
  return a.kind === 'unassign' && b.kind === 'unassign';
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
