import { Tree, TreeLayout } from '@/lib/types';

export const MIN_COLUMN_PCT = 15;

export interface DashboardLayoutRow {
  rowId: string;
  rowIndex: number;
  cells: Array<{ tree: Tree; widthPct: number }>;
}

export type RowDropEdge = 'top' | 'bottom';
export type CellDropEdge = 'left' | 'right';

export type LayoutDropTarget =
  | { kind: 'cell-edge'; rowId: string; colIndex: number; edge: CellDropEdge }
  | { kind: 'row-edge'; rowId: string; edge: RowDropEdge }
  | { kind: 'unassign' };

/**
 * Single source of truth for applying a drag drop to the forest. Used both to
 * compute the live preview during dragover and to commit on drop, so what the
 * user sees while dragging is exactly what they get.
 */
export function applyLayoutDrop(
  forest: Tree[],
  root: string,
  target: LayoutDropTarget,
): Tree[] {
  switch (target.kind) {
    case 'row-edge':
      return moveTreeToRowEdge(forest, root, target.rowId, target.edge);
    case 'cell-edge':
      return moveTreeIntoRow(forest, root, target.rowId, target.colIndex, target.edge);
    case 'unassign':
      return unassignTree(forest, root);
    default:
      return forest;
  }
}

export function getLayoutRows(forest: Tree[]): DashboardLayoutRow[] {
  const byRow = new Map<string, Array<{ tree: Tree; layout: TreeLayout }>>();

  forest.forEach((tree) => {
    if (!tree.layout) return;
    const entries = byRow.get(tree.layout.rowId) || [];
    entries.push({ tree, layout: tree.layout });
    byRow.set(tree.layout.rowId, entries);
  });

  const rows: DashboardLayoutRow[] = [];

  byRow.forEach((entries, rowId) => {
    entries.sort((a, b) => a.layout.colIndex - b.layout.colIndex);
    const rowIndex = entries[0]?.layout.rowIndex ?? 0;

    rows.push({
      rowId,
      rowIndex,
      cells: entries.map(({ tree, layout }) => ({
        tree,
        widthPct: normalizeWidthPct(layout.widthPct),
      })),
    });
  });

  rows.sort((a, b) => a.rowIndex - b.rowIndex);
  rows.forEach((row) => normalizeRowWidths(row));

  return rows;
}

export function getRowGridTemplate(row: DashboardLayoutRow): string {
  return row.cells.map((cell) => `minmax(0, ${cell.widthPct}fr)`).join(' ');
}

export function getUnassignedTrees(forest: Tree[]): Tree[] {
  return forest.filter((tree) => !tree.layout);
}

export function assignTreeToNewRow(forest: Tree[], root: string): Tree[] {
  const rows = getLayoutRows(forest);
  const rowId = newId();
  const rowIndex = rows.length;

  return compactLayout(
    forest.map((tree) => {
      if (tree.root !== root) return tree;
      return {
        ...tree,
        layout: {
          rowId,
          rowIndex,
          colIndex: 0,
          widthPct: 100,
        },
      };
    }),
  );
}

export function unassignTree(forest: Tree[], root: string): Tree[] {
  return compactLayout(
    forest.map((tree) => {
      if (tree.root !== root) return tree;
      return { ...tree, layout: undefined };
    }),
  );
}

export function moveTreeToRowEdge(
  forest: Tree[],
  root: string,
  targetRowId: string,
  edge: RowDropEdge,
): Tree[] {
  if (edge === 'top') {
    return insertTreeAsRowAbove(forest, root, targetRowId);
  }
  return insertTreeAsRowBelow(forest, root, targetRowId);
}

export function moveTreeIntoRow(
  forest: Tree[],
  root: string,
  targetRowId: string,
  targetColIndex: number,
  edge: CellDropEdge,
): Tree[] {
  const rows = getLayoutRows(forest);
  const targetRow = rows.find((row) => row.rowId === targetRowId);
  if (!targetRow) return forest;

  const sourceTree = forest.find((tree) => tree.root === root);
  if (!sourceTree) return forest;

  const sourceLayout = sourceTree.layout;
  const sameRow = sourceLayout?.rowId === targetRowId;

  const otherCells = targetRow.cells.filter((cell) => cell.tree.root !== root);
  const clamped = Math.max(0, Math.min(targetColIndex, otherCells.length));
  const insertAt = edge === 'left' ? clamped : clamped + 1;
  const safeInsertAt = Math.max(0, Math.min(insertAt, otherCells.length));

  const incomingWidth = sameRow && sourceLayout
    ? normalizeWidthPct(sourceLayout.widthPct)
    : computeIncomingWidth(otherCells.length);

  const nextCells = [
    ...otherCells.slice(0, safeInsertAt),
    { tree: sourceTree, widthPct: incomingWidth },
    ...otherCells.slice(safeInsertAt),
  ];

  if (!sameRow) {
    rebalanceCellsForInsertion(nextCells, safeInsertAt);
  } else {
    normalizeWidths(nextCells.map((cell) => cell.widthPct)).forEach((value, index) => {
      nextCells[index].widthPct = value;
    });
  }

  const layoutByRoot = new Map<string, TreeLayout>();
  nextCells.forEach((cell, colIndex) => {
    layoutByRoot.set(cell.tree.root, {
      rowId: targetRowId,
      rowIndex: targetRow.rowIndex,
      colIndex,
      widthPct: cell.widthPct,
    });
  });

  return compactLayout(
    forest.map((tree) => {
      if (layoutByRoot.has(tree.root)) {
        return { ...tree, layout: layoutByRoot.get(tree.root) };
      }
      if (tree.root === root) {
        return { ...tree, layout: undefined };
      }
      return tree;
    }),
  );
}

export function resizeColumn(
  forest: Tree[],
  rowId: string,
  leftColIndex: number,
  leftWidthPct: number,
): Tree[] {
  const rows = getLayoutRows(forest);
  const row = rows.find((r) => r.rowId === rowId);
  if (!row || row.cells.length < 2) return forest;
  if (leftColIndex < 0 || leftColIndex >= row.cells.length - 1) return forest;

  const left = row.cells[leftColIndex];
  const right = row.cells[leftColIndex + 1];
  const pair = left.widthPct + right.widthPct;

  const minLeft = MIN_COLUMN_PCT;
  const minRight = MIN_COLUMN_PCT;
  const clampedLeft = Math.max(minLeft, Math.min(leftWidthPct, pair - minRight));
  const clampedRight = pair - clampedLeft;

  const nextCells = row.cells.map((cell, index) => {
    if (index === leftColIndex) return { ...cell, widthPct: clampedLeft };
    if (index === leftColIndex + 1) return { ...cell, widthPct: clampedRight };
    return cell;
  });

  const layoutByRoot = new Map<string, TreeLayout>();
  nextCells.forEach((cell, colIndex) => {
    layoutByRoot.set(cell.tree.root, {
      rowId,
      rowIndex: row.rowIndex,
      colIndex,
      widthPct: cell.widthPct,
    });
  });

  return forest.map((tree) => (
    layoutByRoot.has(tree.root)
      ? { ...tree, layout: layoutByRoot.get(tree.root) }
      : tree
  ));
}

export function reorderRows(
  forest: Tree[],
  rowId: string,
  toIndex: number,
): Tree[] {
  const rows = getLayoutRows(forest);
  const fromIndex = rows.findIndex((row) => row.rowId === rowId);
  if (fromIndex === -1) return forest;

  const reordered = [...rows];
  const [moved] = reordered.splice(fromIndex, 1);
  const clamped = Math.max(0, Math.min(toIndex, reordered.length));
  reordered.splice(clamped, 0, moved);

  const rowOrder = new Map<string, number>();
  reordered.forEach((row, index) => rowOrder.set(row.rowId, index));

  return compactLayout(
    forest.map((tree) => {
      if (!tree.layout) return tree;
      const rowIndex = rowOrder.get(tree.layout.rowId);
      if (rowIndex === undefined) return tree;
      return {
        ...tree,
        layout: { ...tree.layout, rowIndex },
      };
    }),
  );
}

function insertTreeAsRowAbove(forest: Tree[], root: string, targetRowId: string): Tree[] {
  return insertTreeAsRow(forest, root, targetRowId, 'above');
}

function insertTreeAsRowBelow(forest: Tree[], root: string, targetRowId: string): Tree[] {
  return insertTreeAsRow(forest, root, targetRowId, 'below');
}

function insertTreeAsRow(
  forest: Tree[],
  root: string,
  targetRowId: string,
  position: 'above' | 'below',
): Tree[] {
  const rows = getLayoutRows(forest);
  const targetIndex = rows.findIndex((row) => row.rowId === targetRowId);
  if (targetIndex === -1) return forest;

  // If source is already alone in its row, this can be a pure reorder.
  const sourceTree = forest.find((tree) => tree.root === root);
  const sourceRowId = sourceTree?.layout?.rowId;
  const sourceRow = sourceRowId ? rows.find((row) => row.rowId === sourceRowId) : undefined;
  const sourceIsSolo = sourceRow && sourceRow.cells.length === 1;

  if (sourceIsSolo && sourceRowId) {
    const insertAt = position === 'above' ? targetIndex : targetIndex + 1;
    return reorderRows(forest, sourceRowId, insertAt);
  }

  // Otherwise, create a new row for the source.
  const newRowId = newId();
  const insertAt = position === 'above' ? targetIndex : targetIndex + 1;

  // First remove the source from any existing row, then insert as a fresh solo row.
  const detached = forest.map((tree) => {
    if (tree.root !== root) return tree;
    return {
      ...tree,
      layout: {
        rowId: newRowId,
        rowIndex: insertAt,
        colIndex: 0,
        widthPct: 100,
      },
    };
  });

  // Shift row indices of rows at/after insertAt that aren't the new row.
  const shifted = detached.map((tree) => {
    if (!tree.layout || tree.layout.rowId === newRowId) return tree;
    if (tree.layout.rowIndex < insertAt) return tree;
    return {
      ...tree,
      layout: { ...tree.layout, rowIndex: tree.layout.rowIndex + 1 },
    };
  });

  return compactLayout(shifted);
}

function rebalanceCellsForInsertion(
  cells: Array<{ tree: Tree; widthPct: number }>,
  incomingIndex: number,
) {
  if (cells.length === 1) {
    cells[0].widthPct = 100;
    return;
  }

  const incomingWidth = cells[incomingIndex].widthPct;
  const otherTotal = 100 - incomingWidth;
  const existingTotal = cells.reduce(
    (sum, cell, index) => (index === incomingIndex ? sum : sum + (cell.widthPct ?? 0)),
    0,
  );

  cells.forEach((cell, index) => {
    if (index === incomingIndex) return;
    const share = existingTotal > 0 ? cell.widthPct / existingTotal : 1 / (cells.length - 1);
    cell.widthPct = Math.max(MIN_COLUMN_PCT, otherTotal * share);
  });

  const normalized = normalizeWidths(cells.map((cell) => cell.widthPct));
  normalized.forEach((value, index) => {
    cells[index].widthPct = value;
  });
}

function computeIncomingWidth(existingCount: number): number {
  if (existingCount === 0) return 100;
  const evenShare = Math.floor(100 / (existingCount + 1));
  return Math.max(MIN_COLUMN_PCT, evenShare);
}

function compactLayout(forest: Tree[]): Tree[] {
  const rows = new Map<string, { rowIndex: number; trees: Tree[] }>();

  forest.forEach((tree) => {
    if (!tree.layout) return;
    const existing = rows.get(tree.layout.rowId);
    if (existing) {
      existing.trees.push(tree);
      existing.rowIndex = Math.min(existing.rowIndex, tree.layout.rowIndex);
    } else {
      rows.set(tree.layout.rowId, {
        rowIndex: tree.layout.rowIndex,
        trees: [tree],
      });
    }
  });

  const ordered = [...rows.entries()]
    .sort((a, b) => a[1].rowIndex - b[1].rowIndex)
    .map(([rowId], index) => ({ rowId, rowIndex: index }));

  const rowIndexById = new Map(ordered.map((row) => [row.rowId, row.rowIndex]));

  return forest.map((tree) => {
    if (!tree.layout) return tree;
    const rowIndex = rowIndexById.get(tree.layout.rowId);
    if (rowIndex === undefined) return { ...tree, layout: undefined };

    return {
      ...tree,
      layout: {
        ...tree.layout,
        rowIndex,
        widthPct: normalizeWidthPct(tree.layout.widthPct),
      },
    };
  });
}

function normalizeRowWidths(row: DashboardLayoutRow) {
  if (row.cells.length === 0) return;
  const widths = normalizeWidths(row.cells.map((cell) => cell.widthPct));
  widths.forEach((value, index) => {
    row.cells[index].widthPct = value;
  });
}

function normalizeWidths(widths: number[]): number[] {
  if (widths.length === 0) return [];
  const cleaned = widths.map((value) => (
    Number.isFinite(value) && value > 0 ? value : MIN_COLUMN_PCT
  ));
  const total = cleaned.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    const even = 100 / widths.length;
    return widths.map(() => even);
  }
  const scaled = cleaned.map((value) => (value / total) * 100);
  const min = MIN_COLUMN_PCT;
  const clamped = scaled.map((value) => Math.max(min, value));
  const clampedTotal = clamped.reduce((sum, value) => sum + value, 0);
  return clamped.map((value) => (value / clampedTotal) * 100);
}

function normalizeWidthPct(widthPct: number | undefined): number {
  if (!Number.isFinite(widthPct) || widthPct === undefined) return MIN_COLUMN_PCT;
  return Math.max(MIN_COLUMN_PCT, Math.min(100, widthPct));
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}
