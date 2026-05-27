import React, { useRef, useState } from 'react';
import {
  IconCheck,
  IconGripVertical,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { ApplicationBranch, Leaf } from '@/lib/types';
import SvgIcon from '@/components/SvgIcon';
import { DEFAULT_APPLICATION_ICON } from '@/lib/svg';

interface ApplicationTree {
  root: string;
  branches: ApplicationBranch[];
}

interface TreeApplicationProps {
  tree: ApplicationTree;
  isEditing?: boolean;
  onTreeChange?: (tree: ApplicationTree) => void;
}

type DraggedApplication = {
  branchId: string;
  leafId: string;
};

type DropPlacement = 'before' | 'after';

const TreeApplication: React.FC<TreeApplicationProps> = ({
  tree,
  isEditing = false,
  onTreeChange,
}) => {
  const [editingLeafId, setEditingLeafId] = useState<string | null>(null);
  const [newShelfName, setNewShelfName] = useState('');
  const draggedShelfId = useRef<string | null>(null);
  const draggedApplication = useRef<DraggedApplication | null>(null);
  const applicationInputClass =
    'arena-input w-full focus:border-accent-blue';
  const monoApplicationInputClass = `${applicationInputClass} font-mono text-[11px]`;

  const updateBranches = (branches: ApplicationBranch[]) => {
    onTreeChange?.({ ...tree, branches });
  };

  const updateBranch = (
    branchId: string,
    updater: (branch: ApplicationBranch) => ApplicationBranch,
  ) => {
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

  const addShelf = () => {
    const name = newShelfName.trim();
    if (!name) return;

    updateBranches([
      ...tree.branches,
      {
        id: newId(),
        name,
        leaves: [],
      },
    ]);
    setNewShelfName('');
  };

  const removeShelf = (branchId: string) => {
    updateBranches(tree.branches.filter((branch) => branch.id !== branchId));
  };

  const moveShelf = (targetBranchId: string, placement: DropPlacement) => {
    const sourceBranchId = draggedShelfId.current;
    draggedShelfId.current = null;
    if (!sourceBranchId || sourceBranchId === targetBranchId) return;

    const sourceIndex = tree.branches.findIndex((branch) => branch.id === sourceBranchId);
    const targetIndex = tree.branches.findIndex((branch) => branch.id === targetBranchId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    updateBranches(reorder(tree.branches, sourceIndex, targetIndex, placement));
  };

  const addApplication = (branchId?: string) => {
    const leafId = newId();
    const application = {
      id: leafId,
      name: 'New application',
      url: 'https://',
      icon: DEFAULT_APPLICATION_ICON,
    };

    if (!branchId) {
      updateBranches([
        {
          id: newId(),
          name: 'Applications',
          leaves: [application],
        },
      ]);
      setEditingLeafId(leafId);
      return;
    }

    updateBranch(branchId, (branch) => ({
      ...branch,
      leaves: [...branch.leaves, application],
    }));
    setEditingLeafId(leafId);
  };

  const removeApplication = (branchId: string, leafId: string) => {
    updateBranch(branchId, (branch) => ({
      ...branch,
      leaves: branch.leaves.filter((leaf) => leaf.id !== leafId),
    }));
  };

  const moveApplication = (
    targetBranchId: string,
    targetLeafId?: string,
    placement: DropPlacement = 'before',
  ) => {
    const source = draggedApplication.current;
    draggedApplication.current = null;
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

  const applications = tree.branches.flatMap((branch) => (
    branch.leaves.map((leaf) => ({ branch, leaf }))
  ));

  if (!isEditing) {
    return (
      <div className="relative flex w-full max-w-[90rem] flex-1 flex-wrap items-start gap-4 px-4 md:px-8">
        {applications.map(({ branch, leaf }) => (
          <a
            key={leaf.id}
            href={leaf.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="group block w-full max-w-[320px] min-w-0 text-inherit no-underline"
          >
            <div className="arena-card flex min-h-[72px] items-center gap-3 p-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-sm border border-border-light bg-white text-accent-blue transition-colors duration-200 group-hover:border-accent-blue">
                <SvgIcon svg={leaf.icon} fallback={DEFAULT_APPLICATION_ICON} className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium leading-tight text-text-primary transition-colors duration-200 group-hover:text-accent-blue">
                  {leaf.name}
                </div>
                <div className="mt-1 truncate font-mono text-xs leading-tight text-text-tertiary">
                  {removeProtocol(leaf.url)}
                </div>
                {tree.branches.length > 1 && (
                  <div className="mt-2 truncate text-[10px] uppercase tracking-wider text-text-muted">
                    {branch.name}
                  </div>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="relative flex w-full max-w-[90rem] flex-1 flex-col gap-4 px-4 md:px-8">
      {tree.branches.map((branch) => (
        <section
          key={branch.id}
          className="arena-card p-4"
          onDragOver={(event) => {
            if (draggedShelfId.current || draggedApplication.current) event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedShelfId.current) moveShelf(branch.id, getDropPlacement(event, 'both'));
            if (draggedApplication.current) moveApplication(branch.id);
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <div
              role="button"
              tabIndex={0}
              draggable
              onDragStart={(event) => {
                draggedShelfId.current = branch.id;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', `application-shelf:${branch.id}`);
              }}
              onDragEnd={() => {
                draggedShelfId.current = null;
              }}
              className="flex h-7 w-5 cursor-grab items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text-primary"
              aria-label={`Move ${branch.name}`}
              title="Move shelf"
            >
              <IconGripVertical className="h-4 w-4" />
            </div>
            <input
              value={branch.name}
              onChange={(event) => updateBranch(branch.id, (item) => ({
                ...item,
                name: event.target.value,
              }))}
              className="min-w-0 flex-1 border-0 border-b border-border-light bg-transparent px-0 py-1 text-xs font-medium uppercase tracking-wider text-text-tertiary focus:border-accent-blue focus:ring-0"
            />
            <button
              type="button"
              onClick={() => addApplication(branch.id)}
              className="arena-icon-button"
              aria-label={`Add application to ${branch.name}`}
              title="Add application"
            >
              <IconPlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => removeShelf(branch.id)}
              className="arena-icon-button hover:text-red-500"
              aria-label={`Delete ${branch.name}`}
              title="Delete shelf"
            >
              <IconTrash className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-start gap-3">
            {branch.leaves.map((leaf) => {
              const isLeafEditing = editingLeafId === leaf.id;

              return (
                <div
                  key={leaf.id}
                  className={`group w-full max-w-[320px] rounded-sm border p-3 transition-all duration-200 ${
                    isLeafEditing
                      ? 'border-border-strong bg-white'
                      : 'border-border-light bg-white/70 hover:bg-white'
                  }`}
                  onDragOver={(event) => {
                    if (draggedApplication.current) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    moveApplication(branch.id, leaf.id, getDropPlacement(event, 'both'));
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
                        className={applicationInputClass}
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
                        className={monoApplicationInputClass}
                      />
                      <input
                        type="text"
                        value={leaf.icon}
                        onChange={(event) => updateLeaf(branch.id, leaf.id, (item) => ({
                          ...item,
                          icon: event.target.value,
                        }))}
                        placeholder="SVG icon"
                        className={monoApplicationInputClass}
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
                          onClick={() => removeApplication(branch.id, leaf.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-red-500"
                          aria-label={`Delete ${leaf.name}`}
                          title="Delete application"
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={(event) => {
                          draggedApplication.current = { branchId: branch.id, leafId: leaf.id };
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', `application-leaf:${branch.id}:${leaf.id}`);
                        }}
                        onDragEnd={() => {
                          draggedApplication.current = null;
                        }}
                        className="flex h-8 w-4 cursor-grab items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text-primary"
                        aria-label={`Move ${leaf.name}`}
                        title="Move application"
                      >
                        <IconGripVertical className="h-4 w-4" />
                      </div>
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm border border-border-light bg-white text-accent-blue">
                        <SvgIcon
                          svg={leaf.icon}
                          fallback={DEFAULT_APPLICATION_ICON}
                          className="h-5 w-5"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium leading-tight text-text-primary">
                          {leaf.name}
                        </div>
                        <div className="mt-1 truncate font-mono text-[11px] leading-tight text-text-tertiary">
                          {removeProtocol(leaf.url)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingLeafId(leaf.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-sm text-text-muted opacity-0 transition-opacity hover:bg-surface-sunken hover:text-text-primary group-hover:opacity-100"
                        aria-label={`Edit ${leaf.name}`}
                        title="Edit application"
                      >
                        <IconPencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {branch.leaves.length === 0 && (
              <button
                type="button"
                onClick={() => addApplication(branch.id)}
                className="flex h-[72px] w-full max-w-[320px] items-center justify-center gap-1 rounded-sm border border-dashed border-border-medium bg-white text-xs text-text-tertiary hover:border-accent-blue hover:text-text-primary"
              >
                <IconPlus className="h-3.5 w-3.5" />
                Add application
              </button>
            )}
          </div>
        </section>
      ))}

      {tree.branches.length === 0 && (
        <button
          type="button"
          onClick={() => addApplication()}
          className="flex h-[88px] w-full max-w-[320px] items-center justify-center gap-2 rounded-sm border border-dashed border-border-medium bg-white text-xs text-text-tertiary hover:border-accent-blue hover:text-text-primary"
        >
          <IconPlus className="h-3.5 w-3.5" />
          Add first application
        </button>
      )}

      <div className="flex w-full max-w-[320px] items-center gap-2 rounded-sm border border-dashed border-border-medium bg-white p-4">
        <input
          value={newShelfName}
          onChange={(event) => setNewShelfName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addShelf();
          }}
          placeholder="New shelf"
          className="min-w-0 flex-1 border-0 border-b border-border-light bg-transparent px-0 py-1 text-sm text-text-primary focus:border-accent-blue focus:ring-0"
        />
        <button
          type="button"
          onClick={addShelf}
          className="arena-icon-button"
          aria-label="Add shelf"
          title="Add shelf"
        >
          <IconPlus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

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

export default TreeApplication;
