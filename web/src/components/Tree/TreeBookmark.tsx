import React, { useRef, useState } from 'react';
import {
  IconCheck,
  IconGripVertical,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { BookmarkBranch, Leaf } from '@/lib/types';
import { DEFAULT_BOOKMARK_ICON } from '@/lib/svg';
import { BOOKMARK_ICON_PRESETS } from '@/lib/iconPresets';
import {
  getDropPlacement,
  getSpatialDropPlacement,
  setDragPreview,
  type DragPreviewState,
  type DropPlacement,
} from '@/lib/drag';
import SvgIcon from '@/components/SvgIcon';
import IconField from '@/components/IconField';

interface BookmarkTree {
  root: string;
  branches: BookmarkBranch[];
}

interface TreeBookmarkProps {
  tree: BookmarkTree;
  isEditing?: boolean;
  onTreeChange?: (tree: BookmarkTree) => void;
}

type DraggedLeaf = {
  branchId: string;
  leafId: string;
};

type ActiveDrag = { type: 'branch' | 'leaf'; id: string } | null;

const TreeBookmark: React.FC<TreeBookmarkProps> = ({
  tree,
  isEditing = false,
  onTreeChange,
}) => {
  const [editingLeafId, setEditingLeafId] = useState<string | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const draggedBranchId = useRef<string | null>(null);
  const draggedBranchPreview = useRef<DragPreviewState | null>(null);
  const draggedLeaf = useRef<DraggedLeaf | null>(null);
  const bookmarkInputClass =
    'opaque-input w-full focus:border-accent-green';
  const monoBookmarkInputClass = `${bookmarkInputClass} font-mono text-[11px]`;

  const updateBranches = (branches: BookmarkBranch[]) => {
    onTreeChange?.({ ...tree, branches });
  };

  const updateBranch = (branchId: string, updater: (branch: BookmarkBranch) => BookmarkBranch) => {
    updateBranches(tree.branches.map((branch) => (
      branch.id === branchId ? updater(branch) : branch
    )));
  };

  const updateLeaf = (
    branchId: string,
    leafId: string,
    updater: (leaf: Leaf) => Leaf,
  ) => {
    updateBranch(branchId, (branch) => ({
      ...branch,
      leaves: branch.leaves.map((leaf) => (leaf.id === leafId ? updater(leaf) : leaf)),
    }));
  };

  const addBranch = () => {
    const name = newBranchName.trim();
    if (!name) return;

    updateBranches([
      ...tree.branches,
      {
        id: newId(),
        name,
        leaves: [],
      },
    ]);
    setNewBranchName('');
  };

  const removeBranch = (branchId: string) => {
    updateBranches(tree.branches.filter((branch) => branch.id !== branchId));
  };

  const addLeaf = (branchId: string) => {
    const id = newId();
    const leaf = {
      id,
      name: 'New bookmark',
      url: 'https://',
      icon: DEFAULT_BOOKMARK_ICON,
    };

    updateBranch(branchId, (branch) => ({
      ...branch,
      leaves: [...branch.leaves, leaf],
    }));
    setEditingLeafId(id);
  };

  const removeLeaf = (branchId: string, leafId: string) => {
    updateBranch(branchId, (branch) => ({
      ...branch,
      leaves: branch.leaves.filter((leaf) => leaf.id !== leafId),
    }));
  };

  const moveBranch = (targetBranchId: string, placement: DropPlacement) => {
    const sourceBranchId = draggedBranchId.current;
    if (!sourceBranchId || sourceBranchId === targetBranchId) return;

    const sourceIndex = tree.branches.findIndex((branch) => branch.id === sourceBranchId);
    const targetIndex = tree.branches.findIndex((branch) => branch.id === targetBranchId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextBranches = reorder(tree.branches, sourceIndex, targetIndex, placement);
    if (sameOrder(tree.branches, nextBranches)) return;

    updateBranches(nextBranches);
  };

  const getBranchDropPlacement = (event: React.DragEvent<HTMLElement>) => {
    return getSpatialDropPlacement(event, draggedBranchPreview.current);
  };

  const moveLeaf = (
    targetBranchId: string,
    targetLeafId?: string,
    placement: DropPlacement = 'before',
  ) => {
    const source = draggedLeaf.current;
    if (!source) return;

    const sourceBranch = tree.branches.find((branch) => (
      branch.leaves.some((leaf) => leaf.id === source.leafId)
    ));
    const movedLeaf = sourceBranch?.leaves.find((leaf) => leaf.id === source.leafId);
    if (!sourceBranch || !movedLeaf) return;
    if (sourceBranch.id === targetBranchId && source.leafId === targetLeafId) return;
    if (
      !targetLeafId
      && sourceBranch.id === targetBranchId
      && sourceBranch.leaves[sourceBranch.leaves.length - 1]?.id === source.leafId
    ) return;

    const nextBranches = tree.branches.map((branch) => {
      if (branch.id === sourceBranch.id) {
        return {
          ...branch,
          leaves: branch.leaves.filter((leaf) => leaf.id !== source.leafId),
        };
      }

      return branch;
    });

    const targetBranchIndex = nextBranches.findIndex((branch) => branch.id === targetBranchId);
    if (targetBranchIndex < 0) return;

    const targetBranch = nextBranches[targetBranchIndex];
    const targetIndex = targetLeafId
      ? targetBranch.leaves.findIndex((leaf) => leaf.id === targetLeafId)
      : -1;
    const insertIndex = targetIndex >= 0
      ? targetIndex + (placement === 'after' ? 1 : 0)
      : targetBranch.leaves.length;

    const nextLeaves = [...targetBranch.leaves];
    nextLeaves.splice(insertIndex, 0, movedLeaf);
    nextBranches[targetBranchIndex] = {
      ...targetBranch,
      leaves: nextLeaves,
    };

    draggedLeaf.current = { branchId: targetBranchId, leafId: source.leafId };
    updateBranches(nextBranches);
  };

  const finishDrag = () => {
    draggedBranchId.current = null;
    draggedBranchPreview.current = null;
    draggedLeaf.current = null;
    setActiveDrag(null);
  };

  return (
    <div className="relative grid w-full max-w-[90rem] flex-1 grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] items-start gap-4 px-4 md:px-8">
      {tree.branches.map((branch, branchIndex) => (
        <div
          key={branch.id}
          data-drag-preview
          className={`relative flex w-full animate-fade-in flex-col p-4 transition-all duration-200 ease-in-out ${
            isEditing ? 'opaque-card' : ''
          } ${
            activeDrag?.type === 'branch' && activeDrag.id === branch.id
              ? 'scale-[0.99] opacity-45'
              : ''
          }`}
          style={{ '--branch-index': branchIndex } as React.CSSProperties}
          onDragOver={(event) => {
            if (isEditing && (draggedBranchId.current || draggedLeaf.current)) {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              if (draggedBranchId.current) moveBranch(branch.id, getBranchDropPlacement(event));
              if (draggedLeaf.current) moveLeaf(branch.id);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (!isEditing) return;
            if (draggedBranchId.current) moveBranch(branch.id, getBranchDropPlacement(event));
            if (draggedLeaf.current) moveLeaf(branch.id);
            finishDrag();
          }}
        >
          <div className="relative mb-4 flex items-center gap-2">
            {isEditing && (
              <div
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(event) => {
                  draggedBranchId.current = branch.id;
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', `bookmark-branch:${branch.id}`);
                  draggedBranchPreview.current = setDragPreview(event);
                  setActiveDrag({ type: 'branch', id: branch.id });
                }}
                onDragEnd={finishDrag}
                className="flex h-6 w-5 cursor-grab items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text-primary"
                aria-label={`Move ${branch.name}`}
                title="Move group"
              >
                <IconGripVertical className="h-4 w-4" />
              </div>
            )}

            {isEditing ? (
              <input
                value={branch.name}
                onChange={(event) => updateBranch(branch.id, (item) => ({
                  ...item,
                  name: event.target.value,
                }))}
                className="min-w-0 flex-1 border-0 border-b border-border-light bg-transparent px-0 py-1 text-sm font-medium tracking-tight text-text-primary focus:border-accent-green focus:ring-0"
              />
            ) : (
              <div className="relative text-sm font-medium tracking-tight text-text-primary">
                {branch.name}
                <div className="absolute -bottom-1 left-0 h-[2px] w-6 bg-accent-green" />
              </div>
            )}

            {isEditing && (
              <button
                type="button"
                onClick={() => removeBranch(branch.id)}
                className="flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-red-500"
                aria-label={`Delete ${branch.name}`}
                title="Delete group"
              >
                <IconTrash className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="relative grid flex-1 grid-cols-1 gap-0">
            {branch.leaves.map((leaf) => {
              const isLeafEditing = editingLeafId === leaf.id;

              if (isEditing) {
                return (
                  <div
                    key={leaf.id}
                    data-drag-preview
                    className={`group rounded-sm border p-2 transition-all duration-200 ${
                      isLeafEditing
                        ? 'border-border-strong bg-white'
                        : 'border-border-light bg-white/70 hover:bg-white'
                    } ${
                      activeDrag?.type === 'leaf' && activeDrag.id === leaf.id
                        ? 'scale-[0.98] opacity-40'
                        : ''
                    }`}
                    onDragOver={(event) => {
                      if (!draggedLeaf.current) return;
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = 'move';
                      moveLeaf(branch.id, leaf.id, getDropPlacement(event, 'y'));
                    }}
                    onDrop={(event) => {
                      if (!draggedLeaf.current) return;
                      event.preventDefault();
                      event.stopPropagation();
                      moveLeaf(branch.id, leaf.id, getDropPlacement(event, 'y'));
                      finishDrag();
                    }}
                  >
                    {isLeafEditing ? (
                      <div className="space-y-2">
                        <input
                          value={leaf.name}
                          onChange={(event) => updateLeaf(branch.id, leaf.id, (item) => ({
                            ...item,
                            name: event.target.value,
                          }))}
                          placeholder="Name"
                          className={bookmarkInputClass}
                        />
                        <input
                          value={leaf.url}
                          onChange={(event) => updateLeaf(branch.id, leaf.id, (item) => ({
                            ...item,
                            url: event.target.value,
                          }))}
                          onBlur={() => updateLeaf(branch.id, leaf.id, (item) => ({
                            ...item,
                            url: normalizeUrl(item.url),
                          }))}
                          placeholder="URL"
                          className={monoBookmarkInputClass}
                        />
                        <IconField
                          value={leaf.icon}
                          fallback={DEFAULT_BOOKMARK_ICON}
                          presets={BOOKMARK_ICON_PRESETS}
                          inputClassName={monoBookmarkInputClass}
                          onChange={(icon) => updateLeaf(branch.id, leaf.id, (item) => ({
                            ...item,
                            icon,
                          }))}
                        />
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setEditingLeafId(null)}
                            className="flex h-6 items-center gap-1 rounded-sm px-2 text-xs text-text-secondary hover:bg-surface-sunken"
                          >
                            <IconCheck className="h-3.5 w-3.5" />
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLeaf(branch.id, leaf.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-red-500"
                            aria-label={`Delete ${leaf.name}`}
                            title="Delete bookmark"
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          role="button"
                          tabIndex={0}
                          draggable
                          onDragStart={(event) => {
                            draggedLeaf.current = { branchId: branch.id, leafId: leaf.id };
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', `bookmark-leaf:${branch.id}:${leaf.id}`);
                            setDragPreview(event);
                            setActiveDrag({ type: 'leaf', id: leaf.id });
                          }}
                          onDragEnd={finishDrag}
                          className="flex h-6 w-4 cursor-grab items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text-primary"
                          aria-label={`Move ${leaf.name}`}
                          title="Move bookmark"
                        >
                          <IconGripVertical className="h-4 w-4" />
                        </div>
                        <SvgIcon
                          svg={leaf.icon}
                          fallback={DEFAULT_BOOKMARK_ICON}
                          className="h-5 w-5 flex-shrink-0 text-text-secondary"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-normal leading-tight text-text-primary">
                            {leaf.name}
                          </div>
                          <div className="truncate font-mono text-[11px] leading-tight text-text-tertiary">
                            {removeProtocol(leaf.url)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingLeafId(leaf.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-sm text-text-muted opacity-0 transition-opacity hover:bg-surface-sunken hover:text-text-primary group-hover:opacity-100"
                          aria-label={`Edit ${leaf.name}`}
                          title="Edit bookmark"
                        >
                          <IconPencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <a
                  key={leaf.id}
                  href={leaf.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block text-inherit no-underline transition-all duration-200 ease-in-out"
                >
                  <div className="relative px-1 py-2 transition-colors duration-200 hover:bg-white">
                    <div className="flex items-center gap-2 text-left">
                      <SvgIcon
                        svg={leaf.icon}
                        fallback={DEFAULT_BOOKMARK_ICON}
                        className="h-4 w-4 flex-shrink-0 text-text-secondary transition-colors duration-200 group-hover:text-accent-green"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-normal leading-tight text-text-primary">
                          {leaf.name}
                        </div>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}

            {isEditing && (
              <button
                type="button"
                onClick={() => addLeaf(branch.id)}
                className="mt-3 flex h-8 items-center justify-center gap-1 rounded-sm border border-dashed border-border-medium text-xs text-text-tertiary hover:border-accent-green hover:text-text-primary"
              >
                <IconPlus className="h-3.5 w-3.5" />
                Add bookmark
              </button>
            )}
          </div>
        </div>
      ))}

      {isEditing && (
        <div className="relative flex w-full animate-fade-in flex-col rounded-sm border border-dashed border-border-medium bg-white p-4">
          <div className="mb-3 text-xs uppercase tracking-wider text-text-tertiary">
            New group
          </div>
          <div className="flex items-center gap-2">
            <input
              value={newBranchName}
              onChange={(event) => setNewBranchName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addBranch();
              }}
              placeholder="Name"
              className="min-w-0 flex-1 border-0 border-b border-border-light bg-transparent px-0 py-1 text-sm text-text-primary focus:border-accent-green focus:ring-0"
            />
            <button
              type="button"
              onClick={addBranch}
              className="opaque-icon-button"
              aria-label="Add group"
              title="Add group"
            >
              <IconPlus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function reorder<T>(
  items: T[],
  fromIndex: number,
  toIndex: number,
  placement: DropPlacement,
) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  let insertIndex = placement === 'after' ? toIndex + 1 : toIndex;

  if (fromIndex < insertIndex) insertIndex -= 1;
  next.splice(Math.max(0, Math.min(next.length, insertIndex)), 0, item);
  return next;
}

function sameOrder<T extends { id: string }>(current: T[], next: T[]) {
  return current.length === next.length
    && current.every((item, index) => item.id === next[index]?.id);
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'https://') return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

function removeProtocol(url: string) {
  return url.replace(/(^\w+:|^)\/\//, '');
}

export default TreeBookmark;
