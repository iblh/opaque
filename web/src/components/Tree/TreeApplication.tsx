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
import { APPLICATION_ICON_PRESETS } from '@/lib/iconPresets';
import {
  getDropPlacement,
  getSpatialDropPlacement,
  setDragPreview,
  type DragPreviewState,
  type DropPlacement,
} from '@/lib/drag';
import IconField from '@/components/IconField';
import SectionAddControl from '@/components/Tree/SectionAddControl';

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

type ActiveDrag = { type: 'shelf' | 'application'; id: string } | null;

const TreeApplication: React.FC<TreeApplicationProps> = ({
  tree,
  isEditing = false,
  onTreeChange,
}) => {
  const [editingLeafId, setEditingLeafId] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const draggedShelfId = useRef<string | null>(null);
  const draggedShelfPreview = useRef<DragPreviewState | null>(null);
  const draggedApplication = useRef<DraggedApplication | null>(null);
  const applicationInputClass =
    'opaque-input w-full focus:border-accent-blue';
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
    updateBranches([
      ...tree.branches,
      {
        id: newId(),
        name: 'New shelf',
        leaves: [],
      },
    ]);
  };

  const removeShelf = (branchId: string) => {
    updateBranches(tree.branches.filter((branch) => branch.id !== branchId));
  };

  const moveShelf = (targetBranchId: string, placement: DropPlacement) => {
    const sourceBranchId = draggedShelfId.current;
    if (!sourceBranchId || sourceBranchId === targetBranchId) return;

    const sourceIndex = tree.branches.findIndex((branch) => branch.id === sourceBranchId);
    const targetIndex = tree.branches.findIndex((branch) => branch.id === targetBranchId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextBranches = reorder(tree.branches, sourceIndex, targetIndex, placement);
    if (sameOrder(tree.branches, nextBranches)) return;

    updateBranches(nextBranches);
  };

  const getShelfDropPlacement = (event: React.DragEvent<HTMLElement>) => {
    return getSpatialDropPlacement(event, draggedShelfPreview.current);
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

    draggedApplication.current = { branchId: targetBranchId, leafId: source.leafId };
    updateBranches(nextBranches);
  };

  const finishDrag = () => {
    draggedShelfId.current = null;
    draggedShelfPreview.current = null;
    draggedApplication.current = null;
    setActiveDrag(null);
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
            <div className="flex min-h-[64px] items-center gap-2.5 rounded-sm px-1 py-2 transition-colors duration-200 hover:bg-white">
              <SvgIcon
                svg={leaf.icon}
                fallback={DEFAULT_APPLICATION_ICON}
                className="h-10 w-10 flex-shrink-0 text-accent-blue transition-colors duration-200 group-hover:text-ink-800"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium leading-tight text-text-primary transition-colors duration-200 group-hover:text-accent-blue">
                  {leaf.name}
                </div>
                <div className="mt-1 truncate font-mono text-xs leading-tight text-text-tertiary">
                  {formatApplicationUrl(leaf.url)}
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
      <div className="pointer-events-none absolute -top-8 right-4 z-10 md:right-8">
        <div className="pointer-events-auto">
          <SectionAddControl label="Add shelf" onAdd={addShelf} />
        </div>
      </div>
      {tree.branches.map((branch) => (
        <section
          key={branch.id}
          data-drag-preview
          className={`opaque-card p-4 transition-all duration-200 ${
            activeDrag?.type === 'shelf' && activeDrag.id === branch.id
              ? 'scale-[0.99] opacity-45'
              : ''
          }`}
          onDragOver={(event) => {
            if (!draggedShelfId.current && !draggedApplication.current) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            if (draggedShelfId.current) moveShelf(branch.id, getShelfDropPlacement(event));
            if (draggedApplication.current) moveApplication(branch.id);
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedShelfId.current) moveShelf(branch.id, getShelfDropPlacement(event));
            if (draggedApplication.current) moveApplication(branch.id);
            finishDrag();
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
                draggedShelfPreview.current = setDragPreview(event);
                setActiveDrag({ type: 'shelf', id: branch.id });
              }}
              onDragEnd={finishDrag}
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
              onClick={() => removeShelf(branch.id)}
              className="opaque-icon-button hover:text-red-500"
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
                  data-drag-preview
                  className={`group w-full max-w-[320px] rounded-sm border p-3 transition-all duration-200 ${
                    isLeafEditing
                      ? 'border-border-strong bg-white'
                      : 'border-transparent bg-transparent hover:bg-white'
                  } ${
                    activeDrag?.type === 'application' && activeDrag.id === leaf.id
                      ? 'scale-[0.98] opacity-40'
                      : ''
                  }`}
                  onDragOver={(event) => {
                    if (!draggedApplication.current) return;
                    event.preventDefault();
                    event.stopPropagation();
                    event.dataTransfer.dropEffect = 'move';
                    moveApplication(branch.id, leaf.id, getDropPlacement(event, 'both'));
                  }}
                  onDrop={(event) => {
                    if (!draggedApplication.current) return;
                    event.preventDefault();
                    event.stopPropagation();
                    moveApplication(branch.id, leaf.id, getDropPlacement(event, 'both'));
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
                      <IconField
                        value={leaf.icon}
                        fallback={DEFAULT_APPLICATION_ICON}
                        presets={APPLICATION_ICON_PRESETS}
                        inputClassName={monoApplicationInputClass}
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
                    <div className="flex items-center gap-2.5">
                      <div
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={(event) => {
                          draggedApplication.current = { branchId: branch.id, leafId: leaf.id };
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', `application-leaf:${branch.id}:${leaf.id}`);
                          setDragPreview(event);
                          setActiveDrag({ type: 'application', id: leaf.id });
                        }}
                        onDragEnd={finishDrag}
                        className="flex h-8 w-4 cursor-grab items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text-primary"
                        aria-label={`Move ${leaf.name}`}
                        title="Move application"
                      >
                        <IconGripVertical className="h-4 w-4" />
                      </div>
                      <SvgIcon
                        svg={leaf.icon}
                        fallback={DEFAULT_APPLICATION_ICON}
                        className="h-9 w-9 flex-shrink-0 text-accent-blue"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium leading-tight text-text-primary">
                          {leaf.name}
                        </div>
                        <div className="mt-1 truncate font-mono text-[11px] leading-tight text-text-tertiary">
                          {formatApplicationUrl(leaf.url)}
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

            <button
              type="button"
              onClick={() => addApplication(branch.id)}
              className="group flex min-h-[72px] w-full max-w-[320px] items-center gap-3 rounded-sm border border-dashed border-border-medium bg-white/60 p-3 text-left transition-colors hover:border-accent-blue hover:bg-white"
              aria-label={`Add application to ${branch.name}`}
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-text-tertiary transition-colors group-hover:text-accent-blue">
                <IconPlus className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-tight text-text-secondary transition-colors group-hover:text-text-primary">
                  Add application
                </span>
                <span className="mt-1 block font-mono text-[11px] leading-tight text-text-tertiary">
                  Name, URL, SVG icon
                </span>
              </span>
            </button>
          </div>
        </section>
      ))}

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

function formatApplicationUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'https://') return trimmed;

  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.host.replace(/^www\./i, '');
  } catch {
    return trimmed
      .replace(/(^\w+:|^)\/\//, '')
      .split(/[/?#]/)[0]
      .replace(/^www\./i, '');
  }
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

function sameOrder<T extends { id: string }>(current: T[], next: T[]) {
  return current.length === next.length
    && current.every((item, index) => item.id === next[index]?.id);
}

export default TreeApplication;
