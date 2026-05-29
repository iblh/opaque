import type { DragEvent } from 'react';

export function setDragPreview(event: DragEvent<HTMLElement>) {
  const preview = event.currentTarget.closest('[data-drag-preview]');
  if (!(preview instanceof HTMLElement)) return;

  const rect = preview.getBoundingClientRect();
  event.dataTransfer.setDragImage(
    preview,
    event.clientX - rect.left,
    event.clientY - rect.top,
  );
}
