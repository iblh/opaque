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
import SvgIcon from '@/components/SvgIcon';

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

type DropPlacement = 'before' | 'after';

const TreeBookmark: React.FC<TreeBookmarkProps> = ({
  tree,
  isEditing = false,
  onTreeChange,
}) => {
  const [editingLeafId, setEditingLeafId] = useState<string | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const draggedBranchId = useRef<string | null>(null);
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
    draggedBranchId.current = null;
    if (!sourceBranchId || sourceBranchId === targetBranchId) return;

    const sourceIndex = tree.branches.findIndex((branch) => branch.id === sourceBranchId);
    const targetIndex = tree.branches.findIndex((branch) => branch.id === targetBranchId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    updateBranches(reorder(tree.branches, sourceIndex, targetIndex, placement));
  };

  const moveLeaf = (
    targetBranchId: string,
    targetLeafId?: string,
    placement: DropPlacement = 'before',
  ) => {
    const source = draggedLeaf.current;
    draggedLeaf.current = null;
    if (!source) return;
    if (source.branchId === targetBranchId && source.leafId === targetLeafId) return;

    const sourceBranch = tree.branches.find((branch) => branch.id === source.branchId);
    const movedLeaf = sourceBranch?.leaves.find((leaf) => leaf.id === source.leafId);
    if (!sourceBranch || !movedLeaf) return;

    const nextBranches = tree.branches.map((branch) => {
      if (branch.id === source.branchId) {
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

    updateBranches(nextBranches);
  };

  return (
    <div className="relative grid w-full max-w-[90rem] flex-1 grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4 px-4 md:px-8">
      {tree.branches.map((branch, branchIndex) => (
        <div
          key={branch.id}
          className={`relative flex w-full animate-fade-in flex-col p-4 transition-all duration-200 ease-in-out ${
            isEditing ? 'opaque-card' : ''
          }`}
          style={{ '--branch-index': branchIndex } as React.CSSProperties}
          onDragOver={(event) => {
            if (isEditing && (draggedBranchId.current || draggedLeaf.current)) {
              event.preventDefault();
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (!isEditing) return;
            if (draggedBranchId.current) moveBranch(branch.id, getDropPlacement(event, 'both'));
            if (draggedLeaf.current) moveLeaf(branch.id);
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
                }}
                onDragEnd={() => {
                  draggedBranchId.current = null;
                }}
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
                    className={`group rounded-sm border p-2 transition-all duration-200 ${
                      isLeafEditing
                        ? 'border-border-strong bg-white'
                        : 'border-border-light bg-white/70 hover:bg-white'
                    }`}
                    onDragOver={(event) => {
                      if (draggedLeaf.current) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      moveLeaf(branch.id, leaf.id, getDropPlacement(event, 'y'));
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
                        <input
                          type="text"
                          value={leaf.icon}
                          onChange={(event) => updateLeaf(branch.id, leaf.id, (item) => ({
                            ...item,
                            icon: event.target.value,
                          }))}
                          placeholder="SVG icon"
                          className={monoBookmarkInputClass}
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
                          }}
                          onDragEnd={() => {
                            draggedLeaf.current = null;
                          }}
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

function getDropPlacement(
  event: React.DragEvent<HTMLElement>,
  axis: 'x' | 'y' | 'both',
): DropPlacement {
  const rect = event.currentTarget.getBoundingClientRect();
  const xDelta = event.clientX - (rect.left + rect.width / 2);
  const yDelta = event.clientY - (rect.top + rect.height / 2);

  if (axis === 'x') return xDelta > 0 ? 'after' : 'before';
  if (axis === 'y') return yDelta > 0 ? 'after' : 'before';
  return Math.abs(yDelta) >= Math.abs(xDelta)
    ? yDelta > 0 ? 'after' : 'before'
    : xDelta > 0 ? 'after' : 'before';
}

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
