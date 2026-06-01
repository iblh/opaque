'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { IconGripVertical } from '@tabler/icons-react';
import {
  CellDropEdge,
  DashboardLayoutRow,
  RowDropEdge,
  getLayoutRows,
  getRowGridTemplate,
  getUnassignedTrees,
  moveTreeIntoRow,
  moveTreeToRowEdge,
  resizeColumn,
  assignTreeToNewRow,
  unassignTree,
  MIN_COLUMN_PCT,
} from '@/lib/dashboardLayout';
import { getRootLabel } from '@/lib/modules';
import { Tree } from '@/lib/types';

const DRAG_MIME = 'application/x-opaque-section';

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

export default function DashboardLayoutEditor({
  forest,
  isEditing,
  onForestChange,
  renderSection,
}: DashboardLayoutEditorProps) {
  const rows = useMemo(() => getLayoutRows(forest), [forest]);
  const unassigned = useMemo(() => getUnassignedTrees(forest), [forest]);

  const [draggingRoot, setDraggingRoot] = useState<string | null>(null);
  const [hoverTarget, setHoverTarget] = useState<HoverTarget | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);

  // Hover target is purely visual; commit happens on drop.
  const dragOverCleanup = useRef<number | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraggingRoot(null);
      setHoverTarget(null);
    }
  }, [isEditing]);

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

    const handlePointerUp = () => {
      setResize(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [resize, forest, onForestChange]);

  const handleSectionDragStart = useCallback((event: DragEvent<HTMLElement>, root: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(DRAG_MIME, root);
    // Use the parent section as drag image for a clean preview.
    const section = event.currentTarget.closest('[data-section-root]');
    if (section instanceof HTMLElement) {
      const rect = section.getBoundingClientRect();
      event.dataTransfer.setDragImage(
        section,
        Math.min(event.clientX - rect.left, rect.width),
        Math.min(event.clientY - rect.top, 40),
      );
    }
    setDraggingRoot(root);
  }, []);

  const handleSectionDragEnd = useCallback(() => {
    setDraggingRoot(null);
    setHoverTarget(null);
  }, []);

  const clearHoverSoon = () => {
    if (dragOverCleanup.current !== null) {
      window.cancelAnimationFrame(dragOverCleanup.current);
    }
    dragOverCleanup.current = window.requestAnimationFrame(() => {
      setHoverTarget(null);
    });
  };

  const setHover = (target: HoverTarget | null) => {
    if (dragOverCleanup.current !== null) {
      window.cancelAnimationFrame(dragOverCleanup.current);
      dragOverCleanup.current = null;
    }
    setHoverTarget(target);
  };

  const acceptSectionDrag = (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes(DRAG_MIME)) return false;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    return true;
  };

  const handleCellDragOver = (
    event: DragEvent<HTMLElement>,
    rowId: string,
    colIndex: number,
  ) => {
    if (!acceptSectionDrag(event)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const xRatio = (event.clientX - rect.left) / rect.width;
    const yRatio = (event.clientY - rect.top) / rect.height;

    // Edge bands: top 22% → row above, bottom 22% → row below,
    // left 50% / right 50% → into row at column index.
    if (yRatio < 0.22) {
      setHover({ kind: 'row-edge', rowId, edge: 'top' });
      return;
    }
    if (yRatio > 0.78) {
      setHover({ kind: 'row-edge', rowId, edge: 'bottom' });
      return;
    }
    setHover({
      kind: 'cell-edge',
      rowId,
      colIndex,
      edge: xRatio >= 0.5 ? 'right' : 'left',
    });
  };

  const handleCellDragLeave = () => {
    clearHoverSoon();
  };

  const handleCellDrop = (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes(DRAG_MIME)) return;
    event.preventDefault();
    const root = event.dataTransfer.getData(DRAG_MIME);
    if (!root || !hoverTarget) {
      setHover(null);
      return;
    }

    if (hoverTarget.kind === 'row-edge') {
      onForestChange(moveTreeToRowEdge(forest, root, hoverTarget.rowId, hoverTarget.edge));
    } else if (hoverTarget.kind === 'cell-edge') {
      onForestChange(moveTreeIntoRow(
        forest,
        root,
        hoverTarget.rowId,
        hoverTarget.colIndex,
        hoverTarget.edge,
      ));
    }

    setHover(null);
    setDraggingRoot(null);
  };

  const handleUnassignedDragOver = (event: DragEvent<HTMLElement>) => {
    if (!acceptSectionDrag(event)) return;
    setHover({ kind: 'unassign' });
  };

  const handleUnassignedDrop = (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes(DRAG_MIME)) return;
    event.preventDefault();
    const root = event.dataTransfer.getData(DRAG_MIME);
    if (!root) return;
    onForestChange(unassignTree(forest, root));
    setHover(null);
    setDraggingRoot(null);
  };

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

  return (
    <div className="mx-4 flex flex-col gap-5 md:mx-8">
      {rows.map((row) => (
        <LayoutRow
          key={row.rowId}
          row={row}
          isEditing={isEditing}
          renderSection={renderSection}
          hoverTarget={hoverTarget}
          draggingRoot={draggingRoot}
          resize={resize}
          onSectionDragStart={handleSectionDragStart}
          onSectionDragEnd={handleSectionDragEnd}
          onCellDragOver={handleCellDragOver}
          onCellDragLeave={handleCellDragLeave}
          onCellDrop={handleCellDrop}
          onResizeStart={startResize}
        />
      ))}

      {isEditing && (
        <UnassignedTray
          unassigned={unassigned}
          draggingRoot={draggingRoot}
          isHover={hoverTarget?.kind === 'unassign'}
          onForestChange={onForestChange}
          forest={forest}
          onDragOver={handleUnassignedDragOver}
          onDragLeave={clearHoverSoon}
          onDrop={handleUnassignedDrop}
          onSectionDragStart={handleSectionDragStart}
          onSectionDragEnd={handleSectionDragEnd}
        />
      )}
    </div>
  );
}

type HoverTarget =
  | { kind: 'cell-edge'; rowId: string; colIndex: number; edge: CellDropEdge }
  | { kind: 'row-edge'; rowId: string; edge: RowDropEdge }
  | { kind: 'unassign' };

interface LayoutRowProps {
  row: DashboardLayoutRow;
  isEditing: boolean;
  renderSection: (tree: Tree) => ReactNode;
  hoverTarget: HoverTarget | null;
  draggingRoot: string | null;
  resize: ResizeState | null;
  onSectionDragStart: (event: DragEvent<HTMLElement>, root: string) => void;
  onSectionDragEnd: () => void;
  onCellDragOver: (event: DragEvent<HTMLElement>, rowId: string, colIndex: number) => void;
  onCellDragLeave: () => void;
  onCellDrop: (event: DragEvent<HTMLElement>) => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>, rowId: string, leftColIndex: number) => void;
}

function LayoutRow({
  row,
  isEditing,
  renderSection,
  hoverTarget,
  draggingRoot,
  resize,
  onSectionDragStart,
  onSectionDragEnd,
  onCellDragOver,
  onCellDragLeave,
  onCellDrop,
  onResizeStart,
}: LayoutRowProps) {
  const gridTemplateColumns = useMemo(() => getRowGridTemplate(row), [row]);
  const isRowEdgeTop = hoverTarget?.kind === 'row-edge'
    && hoverTarget.rowId === row.rowId
    && hoverTarget.edge === 'top';
  const isRowEdgeBottom = hoverTarget?.kind === 'row-edge'
    && hoverTarget.rowId === row.rowId
    && hoverTarget.edge === 'bottom';
  const activeResize = resize?.rowId === row.rowId ? resize : null;

  return (
    <div
      data-layout-row
      className="relative"
    >
      <div
        aria-hidden
        className={`absolute -top-2 left-0 right-0 h-px transition-opacity duration-150 ${isRowEdgeTop ? 'bg-text-primary opacity-80' : 'opacity-0'}`}
      />

      <div
        className="grid items-start gap-4 md:gap-5"
        style={{
          gridTemplateColumns,
        } as CSSProperties}
      >
        {row.cells.map((cell, colIndex) => {
          const isCellHoverLeft = hoverTarget?.kind === 'cell-edge'
            && hoverTarget.rowId === row.rowId
            && hoverTarget.colIndex === colIndex
            && hoverTarget.edge === 'left';
          const isCellHoverRight = hoverTarget?.kind === 'cell-edge'
            && hoverTarget.rowId === row.rowId
            && hoverTarget.colIndex === colIndex
            && hoverTarget.edge === 'right';
          const isDraggingThis = draggingRoot === cell.tree.root;

          return (
            <div
              key={cell.tree.root}
              data-section-root={cell.tree.root}
              className={`relative min-w-0 transition-opacity duration-150 ${isDraggingThis ? 'opacity-40' : 'opacity-100'}`}
              onDragOver={isEditing ? (event) => onCellDragOver(event, row.rowId, colIndex) : undefined}
              onDragLeave={isEditing ? onCellDragLeave : undefined}
              onDrop={isEditing ? onCellDrop : undefined}
            >
              <div
                aria-hidden
                className={`pointer-events-none absolute -left-2 top-0 bottom-0 w-px transition-opacity duration-150 ${isCellHoverLeft ? 'bg-text-primary opacity-80' : 'opacity-0'}`}
              />
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-2 top-0 bottom-0 w-px transition-opacity duration-150 ${isCellHoverRight ? 'bg-text-primary opacity-80' : 'opacity-0'}`}
              />

              <SectionHeader
                tree={cell.tree}
                isEditing={isEditing}
                onDragStart={onSectionDragStart}
                onDragEnd={onSectionDragEnd}
              />

              <div>{renderSection(cell.tree)}</div>
            </div>
          );
        })}
      </div>

      {isEditing && row.cells.length > 1 && (
        <div
          className="pointer-events-none absolute inset-0 grid items-stretch gap-4 md:gap-5"
          style={{
            gridTemplateColumns: window === undefined ? '1fr' : gridTemplateColumns,
          } as CSSProperties}
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

      <div
        aria-hidden
        className={`absolute -bottom-2 left-0 right-0 h-px transition-opacity duration-150 ${isRowEdgeBottom ? 'bg-text-primary opacity-80' : 'opacity-0'}`}
      />
    </div>
  );
}

interface SectionHeaderProps {
  tree: Tree;
  isEditing: boolean;
  onDragStart: (event: DragEvent<HTMLElement>, root: string) => void;
  onDragEnd: () => void;
}

function SectionHeader({ tree, isEditing, onDragStart, onDragEnd }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-center gap-3">
      {isEditing && (
        <button
          type="button"
          draggable
          onDragStart={(event) => onDragStart(event, tree.root)}
          onDragEnd={onDragEnd}
          className="group inline-flex h-5 w-5 cursor-grab items-center justify-center text-text-muted transition-colors duration-150 hover:text-text-primary active:cursor-grabbing"
          aria-label={`Drag ${getRootLabel(tree.root)} section`}
          title="Drag to rearrange"
        >
          <IconGripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
        {getRootLabel(tree.root)}
      </div>
      <div className="h-px flex-1 bg-border-light" />
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
  return (
    <div
      className="relative h-full"
      style={{ gridColumn: column, justifySelf: 'start', width: 0 }}
    >
      <div
        className={`pointer-events-auto absolute -left-2 top-8 bottom-0 w-4 cursor-col-resize ${isActive ? '' : 'group/gutter'}`}
        onPointerDown={onPointerDown}
        role="separator"
        aria-orientation="vertical"
      >
        <div
          className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px transition-colors duration-150 ${isActive ? 'bg-text-primary' : 'bg-transparent group-hover/gutter:bg-border-medium'}`}
        />
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-5 w-2 items-center justify-center rounded-sm border border-border-light bg-white transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-0 group-hover/gutter:opacity-100'}`}
        >
          <span className="block h-2 w-px bg-text-tertiary" />
        </div>
        {isActive && hintText && (
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-sm border border-border-light bg-white px-1.5 py-0.5 font-mono text-[10px] tracking-tight text-text-secondary shadow-subtle">
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
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onSectionDragStart: (event: DragEvent<HTMLElement>, root: string) => void;
  onSectionDragEnd: () => void;
}

function UnassignedTray({
  unassigned,
  forest,
  draggingRoot,
  isHover,
  onForestChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onSectionDragStart,
  onSectionDragEnd,
}: UnassignedTrayProps) {
  return (
    <div
      className={`mt-2 border-t pt-4 transition-colors duration-150 ${isHover ? 'border-text-primary' : 'border-border-light'}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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
          unassigned.map((tree) => (
            <button
              key={tree.root}
              type="button"
              draggable
              onDragStart={(event) => onSectionDragStart(event, tree.root)}
              onDragEnd={onSectionDragEnd}
              onClick={() => onForestChange(assignTreeToNewRow(forest, tree.root))}
              className={`inline-flex cursor-grab items-center gap-1.5 border border-border-light bg-white px-2 py-1 text-[11px] text-text-secondary transition-colors duration-150 hover:border-border-medium hover:text-text-primary active:cursor-grabbing ${draggingRoot === tree.root ? 'opacity-40' : ''}`}
              title="Drag onto the dashboard, or click to add a new row"
            >
              <IconGripVertical className="h-3 w-3 text-text-muted" />
              {getRootLabel(tree.root)}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
