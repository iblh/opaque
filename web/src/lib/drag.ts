import type { DragEvent } from 'react';

export type DropPlacement = 'before' | 'after';

const SWAP_THRESHOLD = 0.55;
const ROW_OVERLAP_THRESHOLD = 0.35;

export type DragPreviewState = {
  element: HTMLElement;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  sourceCenterX: number;
  sourceCenterY: number;
  sourceTop: number;
  sourceBottom: number;
};

export function setDragPreview(event: DragEvent<HTMLElement>) {
  const preview = event.currentTarget.closest('[data-drag-preview]');
  if (!(preview instanceof HTMLElement)) return null;

  const rect = preview.getBoundingClientRect();
  event.dataTransfer.setDragImage(
    preview,
    event.clientX - rect.left,
    event.clientY - rect.top,
  );

  return {
    element: preview,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    width: rect.width,
    height: rect.height,
    sourceCenterX: rect.left + rect.width / 2,
    sourceCenterY: rect.top + rect.height / 2,
    sourceTop: rect.top,
    sourceBottom: rect.bottom,
  };
}

export function getDropPlacement(
  event: DragEvent<HTMLElement>,
  axis: 'x' | 'y' | 'both',
  sourceIndex?: number,
  targetIndex?: number,
): DropPlacement {
  const rect = event.currentTarget.getBoundingClientRect();
  const xRatio = clampRatio((event.clientX - rect.left) / rect.width);
  const yRatio = clampRatio((event.clientY - rect.top) / rect.height);
  const activeAxis = resolveAxis(axis, xRatio, yRatio);
  const ratio = activeAxis === 'y' ? yRatio : xRatio;

  if (
    typeof sourceIndex !== 'number'
    || typeof targetIndex !== 'number'
    || sourceIndex === targetIndex
  ) {
    return ratio >= 0.5 ? 'after' : 'before';
  }

  if (sourceIndex < targetIndex) {
    return ratio >= SWAP_THRESHOLD ? 'after' : 'before';
  }

  return ratio <= 1 - SWAP_THRESHOLD ? 'before' : 'after';
}

export function getSpatialDropPlacement(
  event: DragEvent<HTMLElement>,
  dragPreview: DragPreviewState | null,
): DropPlacement {
  if (!dragPreview || dragPreview.element === event.currentTarget) {
    return getDropPlacement(event, 'both');
  }

  const targetRect = event.currentTarget.getBoundingClientRect();
  const ghostCenterX = event.clientX - dragPreview.offsetX + dragPreview.width / 2;
  const ghostCenterY = event.clientY - dragPreview.offsetY + dragPreview.height / 2;
  const xRatio = clampRatio((ghostCenterX - targetRect.left) / targetRect.width);
  const yRatio = clampRatio((ghostCenterY - targetRect.top) / targetRect.height);
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const activeAxis = resolveSpatialAxis(dragPreview, targetRect);
  const movingForward = activeAxis === 'x'
    ? targetCenterX >= dragPreview.sourceCenterX
    : targetCenterY >= dragPreview.sourceCenterY;
  const ratio = activeAxis === 'x' ? xRatio : yRatio;

  return movingForward
    ? ratio >= SWAP_THRESHOLD ? 'after' : 'before'
    : ratio <= 1 - SWAP_THRESHOLD ? 'before' : 'after';
}

function resolveAxis(axis: 'x' | 'y' | 'both', xRatio: number, yRatio: number) {
  if (axis !== 'both') return axis;

  const xDistance = Math.abs(xRatio - 0.5);
  const yDistance = Math.abs(yRatio - 0.5);
  return yDistance > xDistance ? 'y' : 'x';
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function resolveSpatialAxis(
  dragPreview: DragPreviewState,
  targetRect: DOMRect,
) {
  const verticalOverlap = Math.max(
    0,
    Math.min(dragPreview.sourceBottom, targetRect.bottom)
      - Math.max(dragPreview.sourceTop, targetRect.top),
  );
  const sameRow = verticalOverlap >= Math.min(dragPreview.height, targetRect.height)
    * ROW_OVERLAP_THRESHOLD;

  return sameRow ? 'x' : 'y';
}
