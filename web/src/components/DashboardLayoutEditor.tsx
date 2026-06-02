'use client';

import {
  useCallback,
  useEffect,
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
// Fraction of a cell's height that counts as the top/bottom "new row" band.
const ROW_BAND_RATIO = 0.3;
// Hysteresis (px) the pointer must travel past a zone boundary before the
// drop target flips. This is what kills the reflow-induced flutter.
const ZONE_HYSTERESIS = 14;

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
  // Pointer offset within the grabbed section (so the clone tracks naturally).
  pointerOffsetX: number;
  pointerOffsetY: number;
  // Size of the clone, taken from the grabbed section.
  width: number;
  height: number;
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
  const previewForest = useMemo(() => {
    if (!drag || !dropTarget) return forest;
    return applyLayoutDrop(forest, drag.root, dropTarget);
  }, [forest, drag, dropTarget]);

  const rows = useMemo(() => getLayoutRows(previewForest), [previewForest]);
  const unassigned = useMemo(() => getUnassignedTrees(previewForest), [previewForest]);

  // Refs the global pointer handlers read without re-subscribing every render.
  const dragRef = useRef<DragState | null>(null);
  const dropTargetRef = useRef<LayoutDropTarget | null>(null);
  const lastZoneRef = useRef<{ key: string; x: number; y: number } | null>(null);
  const pendingStart = useRef<
    | { root: string; label: string; rect: DOMRect; startX: number; startY: number }
    | null
  >(null);
  const bootstrapRef = useRef(false);
  dragRef.current = drag;
  dropTargetRef.current = dropTarget;

  useEffect(() => {
    if (!isEditing) {
      setDrag(null);
      setDropTarget(null);
      pendingStart.current = null;
      lastZoneRef.current = null;
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
  // Hit-test the cell under the pointer and derive a drop target, applying
  // hysteresis so the live reflow can't cause a flutter loop.
  const computeDropTarget = useCallback((clientX: number, clientY: number): LayoutDropTarget | null => {
    const active = dragRef.current;
    if (!active) return null;

    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return dropTargetRef.current;

    const tray = el.closest('[data-unassigned-tray]');
    if (tray) return { kind: 'unassign' };

    const cellEl = el.closest('[data-section-root]');
    if (!(cellEl instanceof HTMLElement)) {
      // Outside any cell — keep the last target so the preview stays put.
      return dropTargetRef.current;
    }

    // Hovering the dragged section's own placeholder: leave the target as-is so
    // the preview doesn't oscillate as the placeholder tracks the cursor.
    if (cellEl.getAttribute('data-section-root') === active.root) {
      return dropTargetRef.current;
    }

    const rowEl = cellEl.closest('[data-layout-row]');
    const rowId = rowEl instanceof HTMLElement ? rowEl.getAttribute('data-row-id') : null;
    const colIndexAttr = cellEl.getAttribute('data-col-index');
    if (!rowId || colIndexAttr === null) return dropTargetRef.current;
    const colIndex = Number(colIndexAttr);

    const rect = cellEl.getBoundingClientRect();
    const yRatio = (clientY - rect.top) / rect.height;
    const xRatio = (clientX - rect.left) / rect.width;

    let candidate: LayoutDropTarget;
    if (yRatio < ROW_BAND_RATIO) {
      candidate = { kind: 'row-edge', rowId, edge: 'top' };
    } else if (yRatio > 1 - ROW_BAND_RATIO) {
      candidate = { kind: 'row-edge', rowId, edge: 'bottom' };
    } else {
      candidate = { kind: 'cell-edge', rowId, colIndex, edge: xRatio >= 0.5 ? 'right' : 'left' };
    }

    // Hysteresis: if the new candidate differs from the committed target, only
    // accept it once the pointer has moved beyond a small deadzone from where
    // the last zone was entered. This prevents oscillation while the DOM
    // reflows underneath the cursor.
    const prev = dropTargetRef.current;
    if (sameTarget(prev, candidate)) {
      return prev;
    }
    const key = targetKey(candidate);
    const last = lastZoneRef.current;
    if (last && last.key === key) {
      lastZoneRef.current = { key, x: clientX, y: clientY };
      return candidate;
    }
    if (last) {
      const dist = Math.hypot(clientX - last.x, clientY - last.y);
      if (dist < ZONE_HYSTERESIS) {
        return prev; // not committed enough to a new zone yet
      }
    }
    lastZoneRef.current = { key, x: clientX, y: clientY };
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
      lastZoneRef.current = null;
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
    pendingStart.current = {
      root,
      label,
      rect: section.getBoundingClientRect(),
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
      const next: DragState = {
        root: pending.root,
        label: pending.label,
        pointerOffsetX: pending.startX - pending.rect.left,
        pointerOffsetY: pending.startY - pending.rect.top,
        width: pending.rect.width,
        height: pending.rect.height,
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

  return (
    <div className="mx-4 flex flex-col gap-5 md:mx-8">
      {rows.map((row) => (
        <LayoutRow
          key={row.rowId}
          row={row}
          isEditing={isEditing}
          renderSection={renderSection}
          draggingRoot={drag?.root ?? null}
          isDragActive={Boolean(drag)}
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
        <DragClone label={drag.label} drag={drag} />,
        document.body,
      )}
    </div>
  );
}

interface LayoutRowProps {
  row: DashboardLayoutRow;
  isEditing: boolean;
  renderSection: (tree: Tree) => ReactNode;
  draggingRoot: string | null;
  isDragActive: boolean;
  resize: ResizeState | null;
  onGripPointerDown: (event: ReactPointerEvent<HTMLElement>, root: string, label: string) => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>, rowId: string, leftColIndex: number) => void;
}

function LayoutRow({
  row,
  isEditing,
  renderSection,
  draggingRoot,
  isDragActive,
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
      className="relative [--row-gap:1rem] md:[--row-gap:1.25rem]"
    >
      <div
        className="grid items-start transition-[grid-template-columns] duration-200 ease-out"
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
                onGripPointerDown={onGripPointerDown}
              />

              {isPlaceholder ? (
                <PlaceholderBody label={getRootLabel(cell.tree.root)} />
              ) : (
                <div>{renderSection(cell.tree)}</div>
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
  onGripPointerDown: (event: ReactPointerEvent<HTMLElement>, root: string, label: string) => void;
}

function SectionHeader({ tree, isEditing, isPlaceholder, onGripPointerDown }: SectionHeaderProps) {
  const label = getRootLabel(tree.root);
  return (
    <div className={`mb-3 flex items-center gap-3 transition-opacity duration-150 ${isPlaceholder ? 'opacity-30' : ''}`}>
      {isEditing && (
        <button
          type="button"
          onPointerDown={(event) => onGripPointerDown(event, tree.root, label)}
          className="inline-flex h-5 w-5 cursor-grab touch-none items-center justify-center text-text-muted transition-colors duration-150 hover:text-text-primary active:cursor-grabbing"
          aria-label={`Drag ${label} section`}
          title="Drag to rearrange"
        >
          <IconGripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
        {label}
      </div>
      <div className="h-px flex-1 bg-border-light" />
    </div>
  );
}

function PlaceholderBody({ label }: { label: string }) {
  return (
    <div className="flex min-h-[4.5rem] items-center justify-center rounded-sm border border-dashed border-border-strong bg-surface-sunken/50">
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
        {label}
      </span>
    </div>
  );
}

function DragClone({ label, drag }: { label: string; drag: DragState }) {
  // Floating element that follows the cursor until release. Kept lightweight (a
  // labeled chip sized to the source) rather than a full render of the section.
  const style: CSSProperties = {
    position: 'fixed',
    left: drag.clientX - drag.pointerOffsetX,
    top: drag.clientY - drag.pointerOffsetY,
    width: drag.width,
    height: Math.min(drag.height, 96),
    pointerEvents: 'none',
    zIndex: 60,
  };

  return (
    <div style={style} className="animate-fade-in">
      <div className="flex h-full w-full items-center gap-2 rounded-sm border border-border-strong bg-white/95 px-3 shadow-floating backdrop-blur-sm">
        <IconGripVertical className="h-3.5 w-3.5 text-text-muted" />
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          {label}
        </span>
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
          className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px transition-colors duration-150 ${
            isActive
              ? 'bg-text-primary'
              : 'bg-border-medium group-hover/gutter:bg-text-secondary'
          }`}
        />
        {/* Grip pill. Faint at rest, solid on hover / active. */}
        <div
          className={`absolute top-1/2 left-1/2 flex h-6 w-2.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-white transition-all duration-150 ${
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
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[calc(50%+1.25rem)] whitespace-nowrap rounded-sm border border-border-light bg-white px-1.5 py-0.5 font-mono text-[10px] tracking-tight text-text-secondary shadow-subtle">
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
      className={`mt-2 border-t pt-4 transition-colors duration-150 ${isHover ? 'border-text-primary' : 'border-border-light'}`}
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
                className={`inline-flex cursor-grab touch-none items-center gap-1.5 border border-border-light bg-white px-2 py-1 text-[11px] text-text-secondary transition-colors duration-150 hover:border-border-medium hover:text-text-primary active:cursor-grabbing ${draggingRoot === tree.root ? 'opacity-40' : ''}`}
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

function targetKey(target: LayoutDropTarget): string {
  switch (target.kind) {
    case 'row-edge':
      return `row:${target.rowId}:${target.edge}`;
    case 'cell-edge':
      return `cell:${target.rowId}:${target.colIndex}:${target.edge}`;
    case 'unassign':
      return 'unassign';
    default:
      return 'none';
  }
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
