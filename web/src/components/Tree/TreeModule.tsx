import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  IconActivity,
  IconAntennaBars5,
  IconBrandReddit,
  IconCalendarEvent,
  IconChartLine,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCloud,
  IconDeviceTv,
  IconDownload,
  IconGripVertical,
  IconHelpCircle,
  IconLayersOff,
  IconMovie,
  IconNews,
  IconPhotoVideo,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconRss,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import type {
  MarketsModuleData,
  MediaLibraryStat,
  MediaModuleData,
  MediaNowPlayingItem,
  MediaQueueItem,
  MediaRecentItem,
  ModuleData,
  ModuleDataResponse,
  PostsModuleData,
  WeatherModuleData,
} from '@/lib/moduleData';
import { isPostRead, markPostRead, subscribeReadPosts } from '@/lib/readPosts';
import { usePersistedBoolean } from '@/lib/persistedState';
import { KnownModuleType, ModuleBranch } from '@/lib/types';
import {
  createDefaultModuleBranch,
  getAllowedModuleTypes,
  isSingleModuleRoot,
  MODULE_LABELS,
} from '@/lib/modules';
import {
  getSpatialDropPlacement,
  setDragPreview,
  type DragPreviewState,
  type DropPlacement,
} from '@/lib/drag';
import SectionAddControl from '@/components/Tree/SectionAddControl';

interface ModuleTree {
  root: string;
  branches: ModuleBranch[];
}

interface TreeModuleProps {
  tree: ModuleTree;
  isEditing?: boolean;
  onTreeChange?: (tree: ModuleTree) => void;
}

type ModuleRenderItem =
  | { kind: 'module'; module: ModuleBranch }
  | { kind: 'post-stack'; stackId: string; modules: ModuleBranch[] };

interface TabDragProps {
  draggable: boolean;
  onDragStart: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd: (event: React.DragEvent<HTMLElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
}

const moduleInputClass = 'opaque-input w-full focus:border-ink-700';
const moduleLabelClass = 'block text-[10px] uppercase tracking-wider text-text-tertiary';
const moduleGridBaseClass = 'relative grid w-full max-w-[90rem] flex-1 items-start justify-start gap-3';

function moduleGridClassName(root: string) {
  // Posts use a wider reading column; the width must match between view and
  // edit modes so entering edit mode doesn't reshape the section (WYSIWYG).
  if (root === 'posts') {
    return `${moduleGridBaseClass} grid-cols-[repeat(auto-fill,minmax(min(100%,732px),732px))]`;
  }

  // Weather/calendar/markets are glanceable summaries; a narrower column keeps
  // them tidy. Each is its own single-module root now, so the grid holds one.
  if (isSingleModuleRoot(root)) {
    return `${moduleGridBaseClass} grid-cols-[repeat(auto-fill,minmax(min(100%,320px),320px))]`;
  }

  return `${moduleGridBaseClass} grid-cols-[repeat(auto-fill,minmax(min(100%,360px),360px))]`;
}

const TreeModule: React.FC<TreeModuleProps> = ({
  tree,
  isEditing = false,
  onTreeChange,
}) => {
  const allowedTypes = getAllowedModuleTypes(tree.root);
  const isPostsRoot = tree.root === 'posts';
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  // The id of the module/stack currently highlighted as a *merge* drop target.
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const draggedModuleId = useRef<string | null>(null);
  const draggedModulePreview = useRef<DragPreviewState | null>(null);

  const visibleModules = useMemo(() => (
    tree.branches.filter((module) => (
      isEditing || (module.enabled !== false && isKnownModuleType(module.moduleType))
    ))
  ), [isEditing, tree.branches]);
  const renderItems = useMemo(() => (
    moduleRenderItems(tree.root, visibleModules)
  ), [tree.root, visibleModules]);
  const gridClassName = moduleGridClassName(tree.root);

  const updateBranches = (branches: ModuleBranch[]) => {
    onTreeChange?.({ ...tree, branches });
  };

  const moveModule = (targetModuleId: string, placement: DropPlacement) => {
    const sourceModuleId = draggedModuleId.current;
    if (!sourceModuleId || sourceModuleId === targetModuleId) return;

    const sourceIndex = tree.branches.findIndex((module) => module.id === sourceModuleId);
    const targetIndex = tree.branches.findIndex((module) => module.id === targetModuleId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextBranches = reorder(tree.branches, sourceIndex, targetIndex, placement);
    if (sameOrder(tree.branches, nextBranches)) return;

    updateBranches(nextBranches);
  };

  const getModuleDropPlacement = (event: React.DragEvent<HTMLElement>) => (
    getSpatialDropPlacement(event, draggedModulePreview.current)
  );

  // Whether the current drag can merge into the given target (both posts, and
  // not the same module). Used to light up the merge zone and to commit on drop.
  const canMergeInto = (targetId: string) => {
    if (!isPostsRoot) return false;
    const sourceId = draggedModuleId.current;
    if (!sourceId || sourceId === targetId) return false;
    const source = tree.branches.find((m) => m.id === sourceId);
    const target = tree.branches.find((m) => m.id === targetId);
    return Boolean(source && target
      && isPostModuleType(source.moduleType)
      && isPostModuleType(target.moduleType));
  };

  const mergeInto = (targetId: string) => {
    const sourceId = draggedModuleId.current;
    if (!sourceId) return;
    // Always apply: a merge changes config.stackId even when the visual order
    // is unchanged (sameOrder only compares id order, so it can't gate this).
    const next = mergePostIntoStack(tree.branches, sourceId, targetId);
    if (next !== tree.branches) updateBranches(next);
  };

  const unmerge = (moduleId: string) => {
    const next = unmergePost(tree.branches, moduleId);
    if (next !== tree.branches) updateBranches(next);
  };

  // Reposition the dragged module just before/after a group's block (reorder
  // around the group, without joining it).
  const reorderAroundGroup = (stackId: string, placement: DropPlacement) => {
    const sourceId = draggedModuleId.current;
    if (!sourceId) return;
    const next = reorderAroundStack(tree.branches, sourceId, stackId, placement);
    if (next !== tree.branches) updateBranches(next);
  };

  // Handle a tab-to-tab drop. Within the same group it reorders the members;
  // dropping a tab onto a *different* group's tab moves the source into that
  // group (merge) rather than corrupting the array with a cross-group reorder.
  const reorderTab = (targetId: string, placement: DropPlacement) => {
    const sourceId = draggedModuleId.current;
    if (!sourceId || sourceId === targetId) return;
    const source = tree.branches.find((m) => m.id === sourceId);
    const target = tree.branches.find((m) => m.id === targetId);
    if (!source || !target) return;

    const sourceStack = postStackId(source);
    const sameStack = Boolean(sourceStack) && sourceStack === postStackId(target);

    let next: ModuleBranch[];
    if (sameStack) {
      next = reorderWithinStack(tree.branches, sourceId, targetId, placement);
    } else {
      // Move the source into the target's group, then collapse the source's old
      // group if it's now down to a single member (a group of one is standalone).
      next = mergePostIntoStack(tree.branches, sourceId, targetId);
      next = collapseStrayStack(next, sourceStack);
    }
    if (next !== tree.branches) updateBranches(next);
  };

  const finishDrag = () => {
    draggedModuleId.current = null;
    draggedModulePreview.current = null;
    setActiveDragId(null);
    setMergeTargetId(null);
  };

  // Drag props shared by every module/stack card. For posts, dropping near the
  // vertical center of another posts card *merges* into a tab group; dropping
  // near the top/bottom edge *reorders*. Non-posts roots only reorder.
  const cardDragHandlers = (moduleId: string) => ({
    onDragStart: (event: React.DragEvent<HTMLElement>) => {
      draggedModuleId.current = moduleId;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `module:${moduleId}`);
      draggedModulePreview.current = setDragPreview(event);
      setActiveDragId(moduleId);
    },
    onDragEnd: finishDrag,
    onDragOver: (event: React.DragEvent<HTMLElement>) => {
      if (!draggedModuleId.current) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (isMergeZone(event, moduleId)) {
        setMergeTargetId(moduleId);
      } else {
        if (mergeTargetId !== null) setMergeTargetId(null);
        moveModule(moduleId, getModuleDropPlacement(event));
      }
    },
    onDrop: (event: React.DragEvent<HTMLElement>) => {
      if (!draggedModuleId.current) return;
      event.preventDefault();
      if (isMergeZone(event, moduleId)) {
        mergeInto(moduleId);
      } else {
        moveModule(moduleId, getModuleDropPlacement(event));
      }
      finishDrag();
    },
  });

  // Drag props for a tab inside a group: dragging a tab reorders it relative to
  // the other tabs (left/right) within the same group.
  const tabDragHandlers = (moduleId: string) => ({
    draggable: true,
    onDragStart: (event: React.DragEvent<HTMLElement>) => {
      event.stopPropagation();
      draggedModuleId.current = moduleId;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `module:${moduleId}`);
      draggedModulePreview.current = setDragPreview(event);
      setActiveDragId(moduleId);
    },
    onDragEnd: (event: React.DragEvent<HTMLElement>) => {
      event.stopPropagation();
      finishDrag();
    },
    onDragOver: (event: React.DragEvent<HTMLElement>) => {
      if (!draggedModuleId.current) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      reorderTab(moduleId, tabEdgePlacement(event));
    },
    onDrop: (event: React.DragEvent<HTMLElement>) => {
      if (!draggedModuleId.current) return;
      event.preventDefault();
      event.stopPropagation();
      reorderTab(moduleId, tabEdgePlacement(event));
      finishDrag();
    },
  });

  // Tabs lay out horizontally, so left half → 'before', right half → 'after'.
  const tabEdgePlacement = (event: React.DragEvent<HTMLElement>): DropPlacement => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return 'after';
    return (event.clientX - rect.left) / rect.width < 0.5 ? 'before' : 'after';
  };

  // True when the pointer is over the central band of the target card (merge),
  // and a merge is actually possible between the dragged module and this target.
  const isMergeZone = (event: React.DragEvent<HTMLElement>, targetId: string) => {
    if (!canMergeInto(targetId)) return false;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.height <= 0) return false;
    const ratio = (event.clientY - rect.top) / rect.height;
    return ratio >= 0.3 && ratio <= 0.7;
  };

  // Top half → 'before', bottom half → 'after', measured against the target's
  // own box (used for the group container's edge-reorder zones).
  const edgePlacement = (event: React.DragEvent<HTMLElement>): DropPlacement => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.height <= 0) return 'after';
    return (event.clientY - rect.top) / rect.height < 0.5 ? 'before' : 'after';
  };

  const updateModule = (
    moduleId: string,
    updater: (module: ModuleBranch) => ModuleBranch,
  ) => {
    updateBranches(tree.branches.map((module) => (
      module.id === moduleId ? updater(module) : module
    )));
  };

  const addModule = (moduleType: KnownModuleType) => {
    if (!moduleType) return;
    updateBranches([...tree.branches, createDefaultModuleBranch(moduleType)]);
  };

  const removeModule = (moduleId: string) => {
    updateBranches(tree.branches.filter((module) => module.id !== moduleId));
  };

  if (!isEditing && visibleModules.length === 0) return null;

  // Single-module roots (weather/calendar/markets) hold one fixed module and
  // gain position via the layout grid, not by adding modules — so the add
  // control is hidden once that module exists. It stays available while the
  // root is empty, so a deleted Weather/Calendar/Markets can be restored.
  const showAddControl = isEditing
    && allowedTypes.length > 0
    && (!isSingleModuleRoot(tree.root) || tree.branches.length === 0);
  const addControl = showAddControl ? (
    <div className="pointer-events-none absolute -top-8 right-0 z-10">
      <div className="pointer-events-auto">
        <SectionAddControl
          label="Add module"
          options={allowedTypes.map((moduleType) => ({
            value: moduleType,
            label: MODULE_LABELS[moduleType],
          }))}
          onSelect={(value) => addModule(value as KnownModuleType)}
        />
      </div>
    </div>
  ) : null;

  // An empty module root in edit mode shows an inline "add" affordance in the
  // body — without it the section is just a title with nothing beneath it and
  // only a floating control, which reads as broken. Single-module roots offer
  // their one fixed module directly; multi-module roots open the picker.
  if (isEditing && visibleModules.length === 0 && allowedTypes.length > 0) {
    const singleType = isSingleModuleRoot(tree.root) ? allowedTypes[0] : null;
    return (
      <div className="relative">
        {!singleType && addControl}
        <button
          type="button"
          onClick={() => singleType && addModule(singleType)}
          disabled={!singleType}
          className="group flex min-h-[72px] w-full max-w-[320px] items-center justify-center gap-2 rounded-sm border border-dashed border-border-medium bg-surface-elevated/60 p-3 text-xs text-text-tertiary transition-colors enabled:hover:border-accent-green enabled:hover:text-text-primary disabled:opacity-60"
        >
          <IconPlus className="h-3.5 w-3.5" />
          {singleType
            ? `Add ${MODULE_LABELS[singleType]}`
            : 'Use the + above to add a module'}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {addControl}
      <div className={gridClassName}>
        {renderItems.map((item) => {
          if (item.kind === 'post-stack') {
            // The stack's representative id for drag/merge intent (its first member).
            const stackTargetId = item.modules[0]?.id ?? '';
            return isEditing ? (
              <PostsStackEditor
                key={`post-stack-${item.stackId}`}
                modules={item.modules}
                getTabDragProps={tabDragHandlers}
                isDropTarget={mergeTargetId === stackTargetId}
                onDragOver={(event) => {
                  if (!draggedModuleId.current || !canMergeInto(stackTargetId)) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  // Center band → merge into the group; top/bottom edge →
                  // reorder around the group (place before/after it).
                  if (isMergeZone(event, stackTargetId)) {
                    setMergeTargetId(stackTargetId);
                  } else {
                    if (mergeTargetId !== null) setMergeTargetId(null);
                    reorderAroundGroup(item.stackId, edgePlacement(event));
                  }
                }}
                onDrop={(event) => {
                  if (!draggedModuleId.current || !canMergeInto(stackTargetId)) return;
                  event.preventDefault();
                  if (isMergeZone(event, stackTargetId)) {
                    mergeInto(stackTargetId);
                  } else {
                    reorderAroundGroup(item.stackId, edgePlacement(event));
                  }
                  finishDrag();
                }}
                renderModule={(module) => (
                  <ModuleEditCard
                    module={module}
                    allowedTypes={allowedTypes}
                    activeDragId={activeDragId}
                    embedded
                    onUpdate={(updater) => updateModule(module.id, updater)}
                    onRemove={() => removeModule(module.id)}
                    onUnmerge={() => unmerge(module.id)}
                    {...cardDragHandlers(module.id)}
                  />
                )}
              />
            ) : (
              <PostsStackWidget
                key={`post-stack-${item.stackId}`}
                modules={item.modules}
              />
            );
          }

          const { module } = item;

          if (isEditing) {
            return (
              <ModuleEditCard
                key={module.id}
                module={module}
                allowedTypes={allowedTypes}
                activeDragId={activeDragId}
                isMergeTarget={mergeTargetId === module.id}
                {...cardDragHandlers(module.id)}
                onUpdate={(updater) => updateModule(module.id, updater)}
                onRemove={() => removeModule(module.id)}
              />
            );
          }

          return (
            <ModuleWidget key={module.id} module={module} />
          );
        })}
      </div>
    </div>
  );
};

interface ModuleEditCardProps {
  module: ModuleBranch;
  allowedTypes: KnownModuleType[];
  activeDragId: string | null;
  embedded?: boolean;
  isMergeTarget?: boolean;
  onUpdate: (updater: (module: ModuleBranch) => ModuleBranch) => void;
  onRemove: () => void;
  onUnmerge?: () => void;
  onDragStart: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
}

function ModuleEditCard({
  module,
  allowedTypes,
  activeDragId,
  embedded = false,
  isMergeTarget = false,
  onUpdate,
  onRemove,
  onUnmerge,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: ModuleEditCardProps) {
  // Borderless at rest (matching view mode); a faint sunken tint on hover and a
  // dashed ring as merge target keep edit-mode cards readable as drag units.
  const mergeRing = isMergeTarget
    ? 'rounded-sm outline-dashed outline-1 outline-ink-700 bg-surface-elevated'
    : 'hover:bg-surface-sunken/50 rounded-sm';
  const shellClassName = embedded
    ? `relative transition-all ${activeDragId === module.id ? 'scale-[0.98] opacity-45' : ''}`
    : `group relative p-3 transition-all ${mergeRing} ${
        activeDragId === module.id ? 'scale-[0.98] opacity-45' : ''
      }`;

  return (
    <div
      data-drag-preview
      className={shellClassName}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isMergeTarget && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-surface-elevated/70">
          <span className="rounded-sm border border-ink-700 bg-surface-elevated px-2 py-1 text-[10px] uppercase tracking-wider text-ink-700">
            Merge into tab group
          </span>
        </div>
      )}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {embedded ? (
            // Inside a tab group, a source isn't dragged out — it's ungrouped.
            // The handle slot becomes the ungroup action; reorder is via tabs.
            <button
              type="button"
              onClick={onUnmerge}
              className="flex h-6 w-5 flex-shrink-0 items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text-primary"
              aria-label={`Ungroup ${module.name}`}
              title="Ungroup — move out of the tab group"
            >
              <IconLayersOff className="h-4 w-4" />
            </button>
          ) : (
            <div
              role="button"
              tabIndex={0}
              draggable
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              className="flex h-6 w-5 flex-shrink-0 cursor-grab items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text-primary"
              aria-label={`Move ${module.name}`}
              title="Move module"
            >
              <IconGripVertical className="h-4 w-4" />
            </div>
          )}
          <ModuleIcon moduleType={module.moduleType} className="h-4 w-4 text-text-secondary" />
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-text-primary">
              {module.name || getModuleLabel(module.moduleType)}
            </div>
            <div className="mt-0.5 truncate font-mono text-[10px] text-text-tertiary">
              {module.moduleType}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-accent-red-dark"
          aria-label={`Delete ${module.name}`}
          title="Delete module"
        >
          <IconTrash className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        <input
          value={module.name}
          onChange={(event) => onUpdate((item) => ({
            ...item,
            name: event.target.value,
          }))}
          className={moduleInputClass}
          placeholder="Name"
        />
        <select
          value={isKnownModuleType(module.moduleType) ? module.moduleType : ''}
          onChange={(event) => {
            const moduleType = event.target.value as KnownModuleType;
            if (!moduleType) return;
            const nextModule = createDefaultModuleBranch(moduleType);
            const stackId = postStackId(module);
            onUpdate((item) => ({
              ...item,
              moduleType,
              name: nextModule.name,
              config: stackId && isPostModuleType(moduleType)
                ? { ...nextModule.config, stackId }
                : nextModule.config,
            }));
          }}
          className={moduleInputClass}
        >
          {!isKnownModuleType(module.moduleType) && (
            <option value="">Unknown type</option>
          )}
          {allowedTypes.map((moduleType) => (
            <option key={moduleType} value={moduleType}>
              {MODULE_LABELS[moduleType]}
            </option>
          ))}
        </select>
        <label className="flex h-6 items-center gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={module.enabled !== false}
            onChange={(event) => onUpdate((item) => ({
              ...item,
              enabled: event.target.checked,
            }))}
            className="h-3 w-3 rounded-sm border-border-medium text-ink-700 focus:ring-0"
          />
          Enabled
        </label>
        {isKnownModuleType(module.moduleType) && (
          <ModuleConfigFields
            module={module}
            onChange={(config) => onUpdate((item) => ({
              ...item,
              config,
            }))}
          />
        )}
      </div>
    </div>
  );
}

interface ModuleDataState {
  data: ModuleData | null;
  error: string;
  isLoading: boolean;
  refresh: () => void;
}

function ModuleWidget({ module }: { module: ModuleBranch }) {
  if (module.moduleType === 'calendar') {
    return <CalendarWidget module={module} />;
  }

  return <LiveModuleWidget module={module} />;
}

function LiveModuleWidget({ module }: { module: ModuleBranch }) {
  const state = useModuleData(module);

  switch (module.moduleType) {
    case 'weather':
      return <WeatherWidget module={module} state={state} />;
    case 'markets':
      return <MarketsWidget module={module} state={state} />;
    case 'plex':
    case 'jellyfin':
    case 'emby':
    case 'radarr':
    case 'sonarr':
      return <MediaWidget module={module} state={state} />;
    case 'rss':
    case 'reddit':
    case 'hacker-news':
      return <PostsWidget module={module} state={state} />;
    default:
      return null;
  }
}

function CalendarWidget({ module }: { module: ModuleBranch }) {
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const cells = useMemo(() => calendarCells(calendarMonth), [calendarMonth]);

  const moveMonth = (offset: number) => {
    setCalendarMonth((currentMonth) => (
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1)
    ));
  };

  return (
    <ModulePanel module={module}>
      <div>
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-border-light pb-2">
          <div className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
            {formatCalendarMonth(calendarMonth)}
          </div>
          <div className="flex items-center gap-1 text-text-muted">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="flex h-5 w-5 items-center justify-center hover:bg-surface-sunken hover:text-text-primary"
              aria-label="Previous month"
              title="Previous month"
            >
              &lsaquo;
            </button>
            <button
              type="button"
              onClick={() => setCalendarMonth(startOfMonth(new Date()))}
              className="flex h-5 w-5 items-center justify-center hover:bg-surface-sunken hover:text-text-primary"
              aria-label="Current month"
              title="Current month"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            </button>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="flex h-5 w-5 items-center justify-center hover:bg-surface-sunken hover:text-text-primary"
              aria-label="Next month"
              title="Next month"
            >
              &rsaquo;
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday, index) => (
            <div key={`${weekday}-${index}`} className="pb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              {weekday}
            </div>
          ))}
          {cells.map((cell) => (
            <button
              key={cell.key}
              type="button"
              className={`mx-auto flex h-7 w-7 items-center justify-center text-xs transition-colors hover:bg-surface-sunken ${
                cell.inMonth ? 'text-text-primary' : 'text-text-muted'
              } ${cell.isToday ? 'border border-ink-500 bg-surface-sunken text-text-primary' : ''}`}
              title={calendarCellTitle(cell.date)}
              aria-label={calendarCellTitle(cell.date)}
            >
              {cell.date.getDate()}
            </button>
          ))}
        </div>
      </div>
    </ModulePanel>
  );
}

// Session-scoped cache of module data so remounts and tab switches show the
// last known content instantly while a silent refresh runs in the background.
const moduleDataCache = new Map<string, ModuleData>();

function useModuleData(module: ModuleBranch): ModuleDataState {
  const configKey = JSON.stringify(module.config || {});
  const cacheKey = `${module.id}:${configKey}`;
  const [data, setData] = useState<ModuleData | null>(() => moduleDataCache.get(cacheKey) ?? null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(() => !moduleDataCache.has(cacheKey));
  const [requestVersion, setRequestVersion] = useState(0);
  const refresh = useCallback(() => setRequestVersion((version) => version + 1), []);

  // When this hook instance is reused for a different module (switching tabs
  // in a posts group), swap to that module's cached data during render so the
  // previous tab's content never lingers under the new tab's header.
  const lastCacheKeyRef = useRef(cacheKey);
  if (lastCacheKeyRef.current !== cacheKey) {
    lastCacheKeyRef.current = cacheKey;
    setData(moduleDataCache.get(cacheKey) ?? null);
    setError('');
    setIsLoading(!moduleDataCache.has(cacheKey));
  }

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const load = async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/modules/data?moduleId=${encodeURIComponent(module.id)}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load module data.');
        }

        if (!cancelled) {
          const nextData = (payload as ModuleDataResponse).data;
          moduleDataCache.set(cacheKey, nextData);
          setData(nextData);
        }
      } catch (loadError) {
        if (!cancelled && !controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load module data.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    // With cached data on screen, refresh silently (stale-while-revalidate).
    load(moduleDataCache.has(cacheKey));
    const intervalId = window.setInterval(() => load(true), moduleRefreshInterval(module.moduleType));

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [cacheKey, module.id, module.moduleType, requestVersion]);

  return { data, error, isLoading, refresh };
}

// Mounts the data hook for a module without rendering anything — used to warm
// the cache for a posts group's hidden tabs so switching is instant.
function ModulePrefetch({ module }: { module: ModuleBranch }) {
  useModuleData(module);
  return null;
}

function ModulePanel({
  module,
  state,
  href,
  titleOverride,
  header,
  children,
}: {
  module: ModuleBranch;
  state?: ModuleDataState;
  href?: string;
  titleOverride?: string;
  /** Replaces the icon + title cluster, e.g. a tab bar acting as the header. */
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  const statusClass = state?.error
    ? 'bg-accent-red'
    : state?.isLoading
      ? 'bg-ink-300'
      : 'bg-accent-green';
  const title = titleOverride || module.name || getModuleLabel(module.moduleType);
  // Single-module roots (weather/calendar/markets) already carry their name in
  // the section header, so the panel's own icon+title row would be redundant.
  // Show just the status/refresh control on its own right-aligned line so it
  // never overlaps the body's first row (markets rows start flush at the top).
  const titleInSectionHeader = isSingleModuleRoot(module.moduleType) && !header && !titleOverride;

  const statusControl = state ? (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={state.refresh}
        className="flex h-5 w-5 items-center justify-center text-text-muted transition-colors hover:text-text-primary"
        aria-label={`Refresh ${title}`}
        title="Refresh"
      >
        <IconRefresh className={`h-3 w-3 ${state.isLoading ? 'animate-spin' : ''}`} />
      </button>
      <div
        className={`h-1.5 w-1.5 rounded-full ${statusClass}`}
        title={state.error || (state.isLoading ? 'Loading' : 'Online')}
      />
    </div>
  ) : null;

  // Borderless: structure comes from spacing, not a card outline (DESIGN_SPEC).
  return (
    <section className="relative">
      {titleInSectionHeader ? (
        statusControl && (
          <div className="mb-2 flex h-5 items-center justify-end">{statusControl}</div>
        )
      ) : (
        <div className="mb-4 flex items-center justify-between gap-3">
          {header ? (
            <div className="min-w-0 flex-1">{header}</div>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <ModuleIcon moduleType={module.moduleType} className="h-4 w-4 text-text-secondary" />
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-serif text-sm text-text-primary no-underline hover:text-ink-800"
                >
                  {title}
                </a>
              ) : (
                <div className="truncate font-serif text-sm text-text-primary">
                  {title}
                </div>
              )}
            </div>
          )}
          {statusControl}
        </div>
      )}
      {children}
    </section>
  );
}

function WeatherWidget({ module, state }: { module: ModuleBranch; state: ModuleDataState }) {
  const data = state.data?.kind === 'weather' ? state.data as WeatherModuleData : null;

  return (
    <ModulePanel module={module} state={state}>
      {!data ? (
        <ModuleBodyState state={state} skeleton="weather" />
      ) : (
        <>
          <div>
            <div>
              <div className="text-3xl font-light leading-none tracking-tight text-text-primary">
                {Math.round(data.temperature)}°
              </div>
              <div className="mt-2 text-xs text-text-tertiary">
                {data.condition}
              </div>
            </div>
            <div className="mt-4 border-t border-border-light pt-3 font-mono text-[10px] leading-relaxed text-text-tertiary">
              <span className="text-text-secondary">{data.location}</span>
              <span className="mx-1.5 text-text-muted">·</span>
              <span>{Math.round(data.humidity)}% humidity</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {data.forecast.map((day) => (
              <div key={day.date} title={day.condition}>
                <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                  {formatWeekday(day.date)}
                </div>
                <div className="mt-1 font-mono text-[11px] text-text-secondary">
                  {Math.round(day.high)}/{Math.round(day.low)}
                </div>
                <div className="mt-0.5 truncate text-[10px] leading-tight text-text-muted">
                  {day.condition}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ModulePanel>
  );
}

function MarketsWidget({ module, state }: { module: ModuleBranch; state: ModuleDataState }) {
  const data = state.data?.kind === 'markets' ? state.data as MarketsModuleData : null;

  return (
    <ModulePanel module={module} state={state}>
      {!data ? (
        <ModuleBodyState state={state} skeleton="markets" />
      ) : (
        <div className="-my-1 divide-y divide-border-light">
          {data.quotes.map((quote) => {
            const change = `${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`;
            const trendTone = marketTrendTone(quote.changePercent);

            return (
              <div
                key={quote.symbol}
                className="grid grid-cols-[minmax(0,1fr)_56px_minmax(4.5rem,auto)] items-center gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs font-medium uppercase leading-tight tracking-tight text-text-primary">
                    {quote.symbol}
                  </div>
                  <div className="mt-1 truncate text-[10px] leading-tight text-text-tertiary">
                    {quote.name}
                  </div>
                </div>
                <MarketSparkline values={quote.sparkline} />
                <div className="min-w-0 text-right font-mono">
                  <div className={`text-xs font-medium leading-tight tracking-tight ${trendTone}`}>
                    {change}
                  </div>
                  <div className="mt-1 truncate text-[11px] leading-tight text-text-secondary">
                    {formatMarketPrice(quote.price, quote.currency)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ModulePanel>
  );
}

function MarketSparkline({
  values,
}: {
  values: number[];
}) {
  const points = sparklinePoints(values, 56, 24);

  if (!points) {
    return <div className="h-[24px]" />;
  }

  return (
    <div className="h-[24px] w-full overflow-hidden">
      <svg
        viewBox="0 0 56 24"
        preserveAspectRatio="none"
        className="h-full w-full text-ink-400"
        aria-label="Recent price trend"
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function MediaWidget({ module, state }: { module: ModuleBranch; state: ModuleDataState }) {
  const data = state.data?.kind === 'media' ? state.data as MediaModuleData : null;
  const nowPlaying = data?.nowPlaying ?? [];
  const queue = data?.queue ?? [];
  // The Streams stat carries the true session count; nowPlaying is capped for
  // display, so prefer the stat for the "N playing" label on busy servers.
  const streamCount = data
    ? Math.max(nowPlaying.length, toCount(mediaStatValue(data, 'Streams')))
    : 0;
  const [zoomedRecent, setZoomedRecent] = useState<MediaRecentItem | null>(null);

  useEffect(() => {
    if (!zoomedRecent) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomedRecent(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomedRecent]);

  return (
    <ModulePanel module={module} state={state} href={data?.url}>
      {!data ? (
        <ModuleBodyState state={state} skeleton="media" />
      ) : (
        <>
          <div className="mb-4 flex items-baseline justify-between">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent-green">
              <span className={`h-1.5 w-1.5 rounded-full ${streamCount > 0 ? 'bg-accent-green' : 'bg-ink-300'}`} />
              {streamCount > 0 ? `${streamCount} playing` : data.status}
            </div>
            <div className="font-mono text-[10px] text-text-tertiary">
              {data.detail || data.service}
            </div>
          </div>

          {nowPlaying.length > 0 && (
            <div className="mb-4 space-y-2.5">
              {nowPlaying.map((item) => (
                <NowPlayingRow key={item.id} item={item} />
              ))}
            </div>
          )}

          {queue.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-tertiary">
                <IconDownload className="h-3 w-3" />
                Downloading
              </div>
              <div className="space-y-2">
                {queue.map((item) => (
                  <QueueRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {data.libraries && data.libraries.length > 0 ? (
            <MediaLibraries libraries={data.libraries} />
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {data.stats.map((stat) => (
                <div key={stat.label} className="flex items-baseline justify-between gap-2">
                  <div className="truncate text-[10px] uppercase tracking-wider text-text-tertiary">
                    {stat.label}
                  </div>
                  <div className="flex-shrink-0 font-mono text-xs font-medium text-text-primary">
                    {formatCompactStatValue(stat.value)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.recent && data.recent.length > 0 && (
            <MediaRecentlyAdded
              moduleId={module.id}
              items={data.recent}
              lastAddedAt={data.lastAddedAt}
              onZoom={setZoomedRecent}
            />
          )}
          {zoomedRecent && (
            <MediaPosterZoom item={zoomedRecent} onClose={() => setZoomedRecent(null)} />
          )}
        </>
      )}
    </ModulePanel>
  );
}

// Compact library list: single-line rows (type as a trailing tag), capped with
// a quiet "+N more" expander so a server with many libraries stays short.
const LIBRARY_PREVIEW_COUNT = 6;

function MediaLibraries({ libraries }: { libraries: MediaLibraryStat[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? libraries : libraries.slice(0, LIBRARY_PREVIEW_COUNT);
  const hidden = libraries.length - visible.length;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2 text-[10px] uppercase tracking-wider text-text-tertiary">
        <span>Libraries</span>
        <span className="font-mono">{libraries.length}</span>
      </div>
      <div className="space-y-1">
        {visible.map((library) => (
          <div key={library.id} className="flex items-baseline justify-between gap-2">
            <div className="flex min-w-0 items-baseline gap-1.5">
              <span className="truncate text-xs text-text-primary">{library.name}</span>
              {library.type && (
                <span className="flex-shrink-0 font-mono text-[9px] uppercase tracking-wider text-text-muted">
                  {library.type}
                </span>
              )}
            </div>
            <span className="flex-shrink-0 font-mono text-[11px] text-text-secondary">
              {formatCompactNumber(library.count)}
            </span>
          </div>
        ))}
      </div>
      {(hidden > 0 || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1.5 font-mono text-[10px] text-text-muted transition-colors hover:text-text-secondary"
        >
          {expanded ? 'Show less' : `+${hidden} more`}
        </button>
      )}
    </div>
  );
}

// Recently added: a collapsible block (state persisted per module) showing a
// 4-up window of covers with ‹ › paging when there are more than fit.
const RECENT_WINDOW = 4;

function MediaRecentlyAdded({
  moduleId,
  items,
  lastAddedAt,
  onZoom,
}: {
  moduleId: string;
  items: MediaRecentItem[];
  lastAddedAt?: string;
  onZoom: (item: MediaRecentItem) => void;
}) {
  const [collapsed, setCollapsed] = usePersistedBoolean(`opaque:media-recent-collapsed:${moduleId}`, false);
  const [start, setStart] = useState(0);
  const maxStart = Math.max(0, items.length - RECENT_WINDOW);
  // Clamp the window if the item count shrinks between refreshes.
  const clampedStart = Math.min(start, maxStart);
  const canPage = items.length > RECENT_WINDOW;
  const window = items.slice(clampedStart, clampedStart + RECENT_WINDOW);

  // Page from the *displayed* (clamped) index, not the stored one: after a
  // refresh shrinks the list, `start` may sit above maxStart while clampedStart
  // shows the last page, so stepping from `start` would waste a click.
  const page = (delta: number) => {
    setStart(Math.min(Math.max(0, clampedStart + delta), maxStart));
  };

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          className="group/recenthead flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-tertiary transition-colors hover:text-text-secondary"
        >
          <IconChevronDown
            className={`h-3 w-3 transition-transform ${collapsed ? '-rotate-90' : ''}`}
          />
          Recently added
        </button>
        <div className="flex items-center gap-2">
          {lastAddedAt && (
            <span className="font-mono text-[9px] text-text-muted" title={`Last added ${formatRelativeTime(lastAddedAt)}`}>
              {formatRelativeTime(lastAddedAt)}
            </span>
          )}
          {!collapsed && canPage && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => page(-RECENT_WINDOW)}
                disabled={clampedStart === 0}
                aria-label="Newer"
                className="flex h-4 w-4 items-center justify-center text-text-muted transition-colors hover:text-text-primary disabled:opacity-30"
              >
                <IconChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => page(RECENT_WINDOW)}
                disabled={clampedStart >= maxStart}
                aria-label="Older"
                className="flex h-4 w-4 items-center justify-center text-text-muted transition-colors hover:text-text-primary disabled:opacity-30"
              >
                <IconChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
      {!collapsed && (
        <div className="grid grid-cols-4 items-start gap-2">
          {window.map((item) => (
            <MediaRecentCell key={item.id} item={item} onZoom={onZoom} />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaRecentCell({
  item,
  onZoom,
}: {
  item: MediaRecentItem;
  onZoom: (item: MediaRecentItem) => void;
}) {
  const body = (
    <>
      <div className="relative aspect-[2/3] overflow-hidden border border-border-light bg-surface-sunken transition-colors group-hover/recent:border-border-medium">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={`${item.title} cover`}
            width={72}
            height={108}
            loading="lazy"
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-text-muted">
            {item.title.slice(0, 1)}
          </div>
        )}
        {item.addedAt && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1 pb-0.5 pt-3 text-center font-mono text-[8px] text-white/90 opacity-0 transition-opacity group-hover/recent:opacity-100">
            {formatRelativeTime(item.addedAt)}
          </div>
        )}
      </div>
      <div
        className="mt-1 line-clamp-2 text-[10px] font-medium leading-tight text-text-primary"
        title={item.title}
      >
        {item.title}
      </div>
      {item.subtitle && (
        <div
          className="mt-0.5 line-clamp-2 font-mono text-[9px] leading-tight text-text-tertiary"
          title={item.subtitle}
        >
          {item.subtitle}
        </div>
      )}
    </>
  );

  // Only covers with real artwork zoom; letter placeholders stay inert.
  if (!item.imageUrl) {
    return <div className="group/recent min-w-0">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onZoom(item)}
      aria-haspopup="dialog"
      aria-label={`Enlarge ${item.title} cover`}
      className="group/recent block w-full min-w-0 cursor-zoom-in text-left"
    >
      {body}
    </button>
  );
}

// In-panel lightbox: the cover enlarges inside its own module instead of a
// full-screen modal, keeping the rest of the page quiet.
function MediaPosterZoom({
  item,
  onClose,
}: {
  item: MediaRecentItem;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      data-overlay
      onClick={onClose}
      className="absolute inset-0 z-20 flex animate-poster-zoom cursor-zoom-out flex-col items-center justify-center gap-3 bg-surface-elevated/95 p-5"
    >
      <button
        type="button"
        autoFocus
        onClick={onClose}
        aria-label="Close"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-sunken hover:text-text-primary"
      >
        <IconX className="h-3.5 w-3.5" />
      </button>
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <Image
          src={item.imageUrl ?? ''}
          alt={`${item.title} cover`}
          width={300}
          height={450}
          unoptimized
          className="h-full w-auto max-w-full border border-border-light object-contain shadow-elevated"
        />
      </div>
      <div className="max-w-full text-center">
        <div className="truncate font-serif text-sm text-text-primary">{item.title}</div>
        {(item.subtitle || item.addedAt) && (
          <div className="mt-0.5 truncate font-mono text-[10px] text-text-tertiary">
            {item.subtitle}
            {item.subtitle && item.addedAt && ' · '}
            {item.addedAt && `added ${formatRelativeTime(item.addedAt)}`}
          </div>
        )}
      </div>
    </div>
  );
}

function NowPlayingRow({ item }: { item: MediaNowPlayingItem }) {
  const meta = [item.user, item.device].filter(Boolean).join(' · ');
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded-sm border border-border-light bg-surface-sunken">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt=""
            width={32}
            height={48}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            {item.paused ? <IconPlayerPause className="h-3 w-3" /> : <IconPlayerPlay className="h-3 w-3" />}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {item.paused
            ? <IconPlayerPause className="h-3 w-3 flex-shrink-0 text-text-muted" />
            : <IconPlayerPlay className="h-3 w-3 flex-shrink-0 text-accent-green" />}
          <div className="truncate text-xs font-medium text-text-primary" title={item.title}>
            {item.title}
          </div>
        </div>
        <div className="mt-0.5 truncate font-mono text-[9px] text-text-tertiary">
          {item.subtitle ? `${item.subtitle}${meta ? ' · ' : ''}` : ''}{meta}
        </div>
        {item.progress !== undefined && (
          <MediaProgressBar value={item.progress} className="mt-1.5" tone="accent" />
        )}
      </div>
    </div>
  );
}

function QueueRow({ item }: { item: MediaQueueItem }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0 truncate text-xs text-text-primary" title={item.title}>
          {item.title}
          {item.subtitle && <span className="ml-1.5 font-mono text-[9px] text-text-tertiary">{item.subtitle}</span>}
        </div>
        <div className="flex-shrink-0 font-mono text-[9px] text-text-tertiary">
          {item.progress !== undefined ? `${Math.round(item.progress * 100)}%` : (item.status || '')}
        </div>
      </div>
      {item.progress !== undefined && (
        <MediaProgressBar value={item.progress} className="mt-1" tone="ink" />
      )}
    </div>
  );
}

function MediaProgressBar({
  value,
  className = '',
  tone = 'accent',
}: {
  value: number;
  className?: string;
  tone?: 'accent' | 'ink';
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={`h-0.5 w-full overflow-hidden rounded-full bg-border-light ${className}`}>
      <div
        className={`h-full rounded-full ${tone === 'accent' ? 'bg-accent-green' : 'bg-ink-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PostsStackEditor({
  modules,
  renderModule,
  getTabDragProps,
  isDropTarget,
  onDragOver,
  onDrop,
}: {
  modules: ModuleBranch[];
  renderModule: (module: ModuleBranch) => React.ReactNode;
  getTabDragProps: (moduleId: string) => TabDragProps;
  isDropTarget: boolean;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
}) {
  const [selectedId, setSelectedId] = useState(() => modules[0]?.id || '');

  useEffect(() => {
    if (modules.some((module) => module.id === selectedId)) return;
    setSelectedId(modules[0]?.id || '');
  }, [modules, selectedId]);

  const selectedModule = modules.find((module) => module.id === selectedId) || modules[0];
  if (!selectedModule) return null;

  return (
    <div
      className={`rounded-sm p-3 transition-colors ${
        isDropTarget
          ? 'outline-dashed outline-1 outline-ink-700 bg-surface-elevated'
          : 'hover:bg-surface-sunken/50'
      }`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <PostStackTabs
            modules={modules}
            selectedId={selectedModule.id}
            onSelect={setSelectedId}
            getTabDragProps={getTabDragProps}
            framed={false}
          />
        </div>
        <div className="flex-shrink-0 font-mono text-[10px] text-text-muted">
          {modules.length} sources · tabs
        </div>
      </div>

      <div className="mt-2">
        {renderModule(selectedModule)}
      </div>
    </div>
  );
}

function PostsStackWidget({
  modules,
}: {
  modules: ModuleBranch[];
}) {
  const sources = useMemo(() => (
    modules.filter((module) => isPostModuleType(module.moduleType))
  ), [modules]);
  const [selectedId, setSelectedId] = useState(() => preferredPostModuleId(sources));

  useEffect(() => {
    if (sources.some((source) => source.id === selectedId)) return;
    setSelectedId(preferredPostModuleId(sources));
  }, [selectedId, sources]);

  const selectedModule = sources.find((source) => source.id === selectedId) || sources[0];
  if (!selectedModule) return null;

  return (
    <PostsStackLive
      modules={sources}
      selectedModule={selectedModule}
      onSelect={setSelectedId}
    />
  );
}

function PostsStackLive({
  modules,
  selectedModule,
  onSelect,
}: {
  modules: ModuleBranch[];
  selectedModule: ModuleBranch;
  onSelect: (moduleId: string) => void;
}) {
  const state = useModuleData(selectedModule);
  const data = state.data?.kind === 'posts' ? state.data as PostsModuleData : null;

  return (
    <ModulePanel
      module={selectedModule}
      state={state}
      header={(
        <PostStackTabs
          modules={modules}
          selectedId={selectedModule.id}
          onSelect={onSelect}
          framed={false}
        />
      )}
    >
      <PostsContent data={data} state={state} />
      {modules
        .filter((source) => source.id !== selectedModule.id)
        .map((source) => (
          <ModulePrefetch key={source.id} module={source} />
        ))}
    </ModulePanel>
  );
}

function PostStackTabs({
  modules,
  selectedId,
  onSelect,
  getTabDragProps,
  framed = true,
}: {
  modules: ModuleBranch[];
  selectedId: string;
  onSelect: (moduleId: string) => void;
  getTabDragProps?: (moduleId: string) => TabDragProps;
  /** false renders a bare tab row (no baseline rule) for use as a panel header. */
  framed?: boolean;
}) {
  const draggable = Boolean(getTabDragProps);
  return (
    <div
      className={`flex min-w-0 flex-wrap items-end gap-4 ${
        framed ? 'mb-3 border-b border-border-light' : ''
      }`}
    >
      {modules.map((source) => {
        const isSelected = source.id === selectedId;
        const dragProps = getTabDragProps?.(source.id);
        return (
          <button
            key={source.id}
            type="button"
            onClick={() => onSelect(source.id)}
            {...dragProps}
            className={`group relative text-[10px] uppercase tracking-wider transition-colors ${
              framed ? '-mb-px pb-2' : 'pb-1'
            } ${
              draggable ? 'cursor-grab active:cursor-grabbing' : ''
            } ${
              isSelected
                ? 'text-text-primary'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
            title={draggable ? 'Drag to reorder · click to select' : undefined}
          >
            <span className="inline-block max-w-[9rem] truncate">
              {postModuleTabLabel(source)}
            </span>
            <span
              aria-hidden
              className={`absolute bottom-0 left-0 h-px w-full transition-colors ${
                isSelected ? 'bg-ink-700' : 'bg-transparent group-hover:bg-border-medium'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

function PostsWidget({ module, state }: { module: ModuleBranch; state: ModuleDataState }) {
  const data = state.data?.kind === 'posts' ? state.data as PostsModuleData : null;

  return (
    <ModulePanel module={module} state={state}>
      <PostsContent data={data} state={state} />
    </ModulePanel>
  );
}

// Re-renders when post read-state changes, here or in another tab.
function useReadPosts() {
  const [, setVersion] = useState(0);
  useEffect(() => subscribeReadPosts(() => setVersion((value) => value + 1)), []);
  return { isRead: isPostRead, markRead: markPostRead };
}

function PostsContent({
  data,
  state,
}: {
  data: PostsModuleData | null;
  state: ModuleDataState;
}) {
  const { isRead, markRead } = useReadPosts();

  if (!data) return <ModuleBodyState state={state} skeleton="posts" />;
  if (data.posts.length === 0) return <EmptyModuleState>Nothing new today.</EmptyModuleState>;

  return (
    <div className="-mx-2 space-y-0.5">
      {data.posts.map((post) => {
        const read = isRead(post.url);
        return (
          <a
            key={post.id}
            href={post.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => markRead(post.url)}
            onAuxClick={(event) => {
              if (event.button === 1) markRead(post.url);
            }}
            className="group relative block rounded-sm px-2 py-1.5 text-inherit no-underline transition-colors hover:bg-surface-sunken/70"
          >
            <span
              aria-hidden
              className="absolute inset-y-1 left-0 w-px origin-top scale-y-0 bg-accent-green transition-transform group-hover:scale-y-100"
            />
            <div
              className={`line-clamp-2 text-xs leading-relaxed transition-colors ${
                read
                  ? 'text-text-tertiary group-hover:text-text-secondary'
                  : 'text-text-primary group-hover:text-ink-900'
              }`}
            >
              {post.title}
            </div>
            <div
              className={`mt-1 flex items-center gap-2 font-mono text-[10px] transition-colors ${
                read ? 'text-text-muted' : 'text-text-tertiary group-hover:text-text-secondary'
              }`}
            >
              <span>{post.source}</span>
              {(post.meta || post.publishedAt) && <span>·</span>}
              {post.meta && <span className="truncate">{post.meta}</span>}
              {post.publishedAt && <span className="flex-shrink-0">{formatRelativeTime(post.publishedAt)}</span>}
            </div>
          </a>
        );
      })}
    </div>
  );
}

type ModuleSkeletonKind = 'weather' | 'markets' | 'media' | 'posts' | 'generic';

function ModuleBodyState({
  state,
  skeleton = 'generic',
}: {
  state: ModuleDataState;
  skeleton?: ModuleSkeletonKind;
}) {
  if (state.error) {
    return (
      <div className="min-h-16 text-[11px] leading-relaxed text-accent-red-dark">
        {state.error}
      </div>
    );
  }

  return <ModuleSkeleton kind={skeleton} />;
}

const skeletonBar = 'rounded-sm bg-surface-sunken';
const skeletonBarSoft = 'rounded-sm bg-[#f1f1f1]';

// Loading placeholders that echo each module's real content structure, so the
// panel doesn't reshape when live data arrives.
function ModuleSkeleton({ kind }: { kind: ModuleSkeletonKind }) {
  if (kind === 'weather') {
    return (
      <div className="animate-pulse" aria-hidden>
        <div className={`h-8 w-20 ${skeletonBar}`} />
        <div className={`mt-2 h-2.5 w-24 ${skeletonBarSoft}`} />
        <div className={`mt-4 h-2 w-36 ${skeletonBarSoft}`} />
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border-light pt-3">
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <div className={`h-2 w-8 ${skeletonBarSoft}`} />
              <div className={`mt-1.5 h-2.5 w-12 ${skeletonBar}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'markets') {
    return (
      <div className="-my-1 animate-pulse divide-y divide-border-light" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="grid grid-cols-[minmax(4.75rem,0.9fr)_minmax(4.25rem,1fr)_minmax(4.5rem,auto)] items-center gap-3 py-2.5">
            <div>
              <div className={`h-2.5 w-12 ${skeletonBar}`} />
              <div className={`mt-1.5 h-2 w-16 ${skeletonBarSoft}`} />
            </div>
            <div className={`h-[26px] w-full ${skeletonBarSoft}`} />
            <div className="justify-self-end">
              <div className={`h-2.5 w-12 ${skeletonBar}`} />
              <div className={`mt-1.5 h-2 w-14 ${skeletonBarSoft}`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (kind === 'media') {
    return (
      <div className="animate-pulse" aria-hidden>
        <div className="mb-4 flex items-baseline justify-between">
          <div className={`h-2 w-12 ${skeletonBar}`} />
          <div className={`h-2 w-16 ${skeletonBarSoft}`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((index) => (
            <div key={index}>
              <div className={`h-2 w-14 ${skeletonBarSoft}`} />
              <div className={`mt-1.5 h-3.5 w-10 ${skeletonBar}`} />
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-border-light pt-3">
          <div className={`h-2 w-24 ${skeletonBarSoft}`} />
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((index) => (
              <div key={index}>
                <div className={`aspect-[2/3] ${skeletonBar}`} />
                <div className={`mt-1.5 h-2 w-full ${skeletonBarSoft}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'posts') {
    return (
      <div className="animate-pulse space-y-3.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index}>
            <div className={`h-2.5 ${skeletonBar}`} style={{ width: `${82 - (index % 3) * 14}%` }} />
            <div className={`mt-1.5 h-2 w-2/5 ${skeletonBarSoft}`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-16 animate-pulse space-y-2.5" aria-hidden>
      <div className={`h-2.5 w-3/4 ${skeletonBar}`} />
      <div className={`h-2.5 w-1/2 ${skeletonBarSoft}`} />
      <div className={`h-2.5 w-2/3 ${skeletonBarSoft}`} />
    </div>
  );
}

function EmptyModuleState({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-16 text-[11px] leading-relaxed text-text-tertiary">
      {children}
    </div>
  );
}

function ModuleConfigFields({
  module,
  onChange,
}: {
  module: ModuleBranch;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const config = module.config || {};
  const setValue = (key: string, value: unknown) => onChange({ ...config, [key]: value });

  let fields: React.ReactNode;
  switch (module.moduleType) {
    case 'weather':
      fields = (
        <>
          <ConfigInput
            label="Location"
            value={configText(config, 'location')}
            placeholder="San Francisco"
            onChange={(value) => setValue('location', value)}
          />
          <ConfigInput
            label="Country code"
            value={configText(config, 'countryCode')}
            placeholder="US"
            onChange={(value) => setValue('countryCode', value.toUpperCase())}
          />
          <ConfigInput
            label="Region / state"
            value={configText(config, 'region')}
            placeholder="California"
            onChange={(value) => setValue('region', value)}
          />
          <ConfigSelect
            label="Units"
            value={configText(config, 'units') || 'imperial'}
            onChange={(value) => setValue('units', value)}
            options={[
              ['imperial', 'Imperial'],
              ['metric', 'Metric'],
            ]}
          />
        </>
      );
      break;
    case 'calendar':
      fields = (
        <div className="text-[10px] leading-relaxed text-text-muted">
          No configuration required. Calendar is a local month view.
        </div>
      );
      break;
    case 'markets':
      fields = (
        <ConfigInput
          label="Symbols"
          value={configListText(config, 'symbols')}
          placeholder="SPY, BTC-USD, NVDA, AAPL, MSFT"
          onChange={(value) => setValue('symbols', value)}
        />
      );
      break;
    case 'plex':
      fields = (
        <>
          <ConfigInput
            label="Plex URL"
            value={configText(config, 'url')}
            placeholder="http://plex:32400 or https://app.plex.tv"
            onChange={(value) => setValue('url', value)}
            help="Use the actual Plex Media Server URL when possible, for example http://server-ip:32400. app.plex.tv is accepted only to auto-discover a server from your token."
          />
          <ConfigInput
            label="Plex token"
            type="password"
            value={configText(config, 'token')}
            onChange={(value) => setValue('token', value)}
            help={mediaCredentialHelp('plex')}
          />
        </>
      );
      break;
    case 'jellyfin':
    case 'emby':
    case 'radarr':
    case 'sonarr':
      fields = (
        <>
          <ConfigInput
            label={`${getModuleLabel(module.moduleType)} URL`}
            value={configText(config, 'url')}
            placeholder="http://service:port"
            onChange={(value) => setValue('url', value)}
          />
          <ConfigInput
            label="API key"
            type="password"
            value={configText(config, 'apiKey')}
            onChange={(value) => setValue('apiKey', value)}
            help={mediaCredentialHelp(module.moduleType)}
          />
        </>
      );
      break;
    case 'rss':
      fields = (
        <>
          <ConfigTextarea
            label="Feed URLs"
            value={configListText(config, 'feeds', '\n')}
            placeholder={'https://example.com/feed.xml\nhttps://example.com/atom.xml'}
            onChange={(value) => setValue('feeds', value)}
          />
          <ConfigNumberInput
            label="Post limit"
            value={configNumberValue(config, 'limit', 5)}
            min={1}
            max={15}
            onChange={(value) => setValue('limit', value)}
          />
        </>
      );
      break;
    case 'reddit':
      fields = (
        <>
          <ConfigInput
            label="Subreddit"
            value={configText(config, 'subreddit')}
            placeholder="selfhosted"
            onChange={(value) => setValue('subreddit', value)}
          />
          <ConfigSelect
            label="Sort"
            value={configText(config, 'sort') || 'hot'}
            onChange={(value) => setValue('sort', value)}
            options={[
              ['hot', 'Hot'],
              ['new', 'New'],
              ['top', 'Top today'],
            ]}
          />
          <ConfigNumberInput
            label="Post limit"
            value={configNumberValue(config, 'limit', 5)}
            min={1}
            max={15}
            onChange={(value) => setValue('limit', value)}
          />
        </>
      );
      break;
    case 'hacker-news':
      fields = (
        <>
          <ConfigSelect
            label="Feed"
            value={configText(config, 'feed') || 'top'}
            onChange={(value) => setValue('feed', value)}
            options={[
              ['top', 'Top'],
              ['new', 'New'],
              ['best', 'Best'],
              ['ask', 'Ask HN'],
              ['show', 'Show HN'],
              ['jobs', 'Jobs'],
            ]}
          />
          <ConfigNumberInput
            label="Post limit"
            value={configNumberValue(config, 'limit', 5)}
            min={1}
            max={15}
            onChange={(value) => setValue('limit', value)}
          />
        </>
      );
      break;
    default:
      fields = null;
  }

  return (
    <div className="space-y-2 border-t border-border-light pt-3">
      {fields}
      {module.moduleType !== 'calendar' && (
        <div className="text-[10px] leading-relaxed text-text-muted">
          Live data refreshes after the dashboard is saved.
        </div>
      )}
    </div>
  );
}

function mediaCredentialHelp(moduleType: string) {
  switch (moduleType) {
    case 'plex':
      return 'Open Plex Web with your account, inspect a server/library XML request, and copy the X-Plex-Token value from the URL or request headers. Account tokens can also discover servers from app.plex.tv.';
    case 'jellyfin':
      return 'In Jellyfin, open Dashboard -> Advanced -> API Keys, create a new key for OPAQUE, then paste it here.';
    case 'emby':
      return 'In Emby, open Server Dashboard -> Advanced -> API Keys, create a new API key, then paste it here.';
    case 'radarr':
      return 'In Radarr, open Settings -> General -> Security and copy the API Key.';
    case 'sonarr':
      return 'In Sonarr, open Settings -> General -> Security and copy the API Key.';
    default:
      return 'Open the service admin settings and create or copy an API token for OPAQUE.';
  }
}

function ConfigInput({
  label,
  value,
  placeholder,
  type = 'text',
  help,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: 'text' | 'password';
  help?: React.ReactNode;
  onChange: (value: string) => void;
}) {
  const inputId = useId();

  return (
    <div className="space-y-1">
      <ConfigFieldLabel htmlFor={inputId} label={label} help={help} />
      <input
        id={inputId}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        className={moduleInputClass}
      />
    </div>
  );
}

function ConfigNumberInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const inputId = useId();

  return (
    <div className="space-y-1">
      <ConfigFieldLabel htmlFor={inputId} label={label} />
      <input
        id={inputId}
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
        className={moduleInputClass}
      />
    </div>
  );
}

function ConfigSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  const selectId = useId();

  return (
    <div className="space-y-1">
      <ConfigFieldLabel htmlFor={selectId} label={label} />
      <select
        id={selectId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={moduleInputClass}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </div>
  );
}

function ConfigTextarea({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const textareaId = useId();

  return (
    <div className="space-y-1">
      <ConfigFieldLabel htmlFor={textareaId} label={label} />
      <textarea
        id={textareaId}
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className={`${moduleInputClass} resize-y`}
      />
    </div>
  );
}

function ConfigFieldLabel({
  htmlFor,
  label,
  help,
}: {
  htmlFor: string;
  label: string;
  help?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1">
      <label htmlFor={htmlFor} className={moduleLabelClass}>
        {label}
      </label>
      {help && (
        <span className="group/help relative inline-flex">
          <button
            type="button"
            className="flex h-4 w-4 items-center justify-center rounded-full text-text-muted hover:bg-surface-sunken hover:text-text-primary"
            aria-label={`${label} help`}
          >
            <IconHelpCircle className="h-3 w-3" />
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 border border-border-medium bg-surface-elevated p-2 text-[10px] normal-case leading-relaxed tracking-normal text-text-secondary opacity-0 shadow-sm transition-opacity group-hover/help:opacity-100 group-focus-within/help:opacity-100"
          >
            {help}
          </span>
        </span>
      )}
    </div>
  );
}

function ModuleIcon({
  moduleType,
  className,
}: {
  moduleType: string;
  className?: string;
}) {
  const Icon = getModuleIcon(moduleType);
  return <Icon className={className} />;
}

function getModuleIcon(moduleType: string) {
  switch (moduleType) {
    case 'weather':
      return IconCloud;
    case 'calendar':
      return IconCalendarEvent;
    case 'markets':
      return IconChartLine;
    case 'plex':
      return IconPlayerPlay;
    case 'jellyfin':
      return IconDeviceTv;
    case 'emby':
      return IconPhotoVideo;
    case 'radarr':
      return IconMovie;
    case 'sonarr':
      return IconAntennaBars5;
    case 'rss':
      return IconRss;
    case 'reddit':
      return IconBrandReddit;
    case 'hacker-news':
      return IconNews;
    default:
      return IconActivity;
  }
}

function moduleRenderItems(root: string, modules: ModuleBranch[]): ModuleRenderItem[] {
  if (root !== 'posts') {
    return modules.map((module) => ({ kind: 'module', module }));
  }

  // Count members per stack so a group of one collapses back to a plain module.
  const stackCounts = new Map<string, number>();
  modules.forEach((module) => {
    const stackId = postStackId(module);
    if (stackId && isPostModuleType(module.moduleType)) {
      stackCounts.set(stackId, (stackCounts.get(stackId) || 0) + 1);
    }
  });

  const items: ModuleRenderItem[] = [];
  const stackItems = new Map<string, Extract<ModuleRenderItem, { kind: 'post-stack' }>>();

  modules.forEach((module) => {
    const stackId = postStackId(module);
    const inRealStack = Boolean(stackId)
      && isPostModuleType(module.moduleType)
      && (stackCounts.get(stackId) || 0) > 1;

    if (!inRealStack) {
      items.push({ kind: 'module', module });
      return;
    }

    let stack = stackItems.get(stackId);
    if (!stack) {
      stack = { kind: 'post-stack', stackId, modules: [] };
      stackItems.set(stackId, stack);
      items.push(stack);
    }

    stack.modules.push(module);
  });

  return items;
}

function getModuleLabel(moduleType: string) {
  return (MODULE_LABELS as Record<string, string>)[moduleType] || 'Unknown module';
}

function isPostModuleType(moduleType: string) {
  return ['rss', 'reddit', 'hacker-news'].includes(moduleType);
}

function postStackId(module: ModuleBranch) {
  const value = module.config?.stackId;
  return typeof value === 'string' ? value.trim() : '';
}

function withStackId(module: ModuleBranch, stackId: string | null): ModuleBranch {
  const config = { ...(module.config || {}) };
  if (stackId) {
    config.stackId = stackId;
  } else {
    delete config.stackId;
  }
  return { ...module, config };
}

function newStackId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `stack-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `stack-${Math.random().toString(36).slice(2, 10)}`;
}

// Merge the source posts module into the same tab group as the target, placing
// it immediately after the target. If the target has no group yet, a new group
// id is created and applied to both — so two standalone posts become a stack.
function mergePostIntoStack(
  branches: ModuleBranch[],
  sourceId: string,
  targetId: string,
): ModuleBranch[] {
  if (sourceId === targetId) return branches;
  const source = branches.find((m) => m.id === sourceId);
  const target = branches.find((m) => m.id === targetId);
  if (!source || !target) return branches;
  if (!isPostModuleType(source.moduleType) || !isPostModuleType(target.moduleType)) return branches;

  const stackId = postStackId(target) || newStackId();
  const targetStackMemberIds = new Set(
    branches
      .filter((m) => postStackId(m) === stackId || m.id === targetId)
      .map((m) => m.id),
  );

  const updatedSource = withStackId(source, stackId);
  const updatedTarget = postStackId(target) ? target : withStackId(target, stackId);

  // Rebuild order: drop source from its old spot, then insert it right after the
  // last member of the target's group so grouped sources stay contiguous.
  const withoutSource = branches
    .filter((m) => m.id !== sourceId)
    .map((m) => (m.id === targetId ? updatedTarget : m));

  let lastGroupIndex = -1;
  withoutSource.forEach((m, index) => {
    if (m.id === targetId || targetStackMemberIds.has(m.id) || postStackId(m) === stackId) {
      lastGroupIndex = index;
    }
  });

  const next = [...withoutSource];
  next.splice(lastGroupIndex + 1, 0, updatedSource);
  return next;
}

// Move a source module to just before/after a target group's contiguous block,
// leaving it outside the group. If the source belonged to a different group it
// is detached first (dropping at a group's edge means "place next to it", not
// "join it"). Members of the *same* group are reordered by reorderWithinStack.
function reorderAroundStack(
  branches: ModuleBranch[],
  sourceId: string,
  stackId: string,
  placement: DropPlacement,
): ModuleBranch[] {
  const source = branches.find((m) => m.id === sourceId);
  if (!source) return branches;
  // Dropping a member of this same group on its own edge is a no-op here.
  if (postStackId(source) === stackId) return branches;

  const detachedSource = withStackId(source, null);
  const withoutSource = branches.filter((m) => m.id !== sourceId);

  const groupIndices = withoutSource
    .map((m, index) => (postStackId(m) === stackId ? index : -1))
    .filter((index) => index >= 0);
  if (groupIndices.length === 0) return branches;

  const insertAt = placement === 'before'
    ? groupIndices[0]
    : groupIndices[groupIndices.length - 1] + 1;

  const next = [...withoutSource];
  next.splice(insertAt, 0, detachedSource);
  return next;
}

// Reorder one group member relative to another *within the same tab group*.
// Only applies when both modules already share a (non-empty) stackId; a
// cross-group drop would interleave the flat array and desync persisted vs
// visual order, so it is rejected here (the caller routes that case to merge).
function reorderWithinStack(
  branches: ModuleBranch[],
  sourceId: string,
  targetId: string,
  placement: DropPlacement,
): ModuleBranch[] {
  if (sourceId === targetId) return branches;
  const source = branches.find((m) => m.id === sourceId);
  const target = branches.find((m) => m.id === targetId);
  if (!source || !target) return branches;
  const stackId = postStackId(source);
  if (!stackId || stackId !== postStackId(target)) return branches;

  const sourceIndex = branches.indexOf(source);
  const targetIndex = branches.indexOf(target);
  const next = reorder(branches, sourceIndex, targetIndex, placement);
  return sameOrder(branches, next) ? branches : next;
}

// If the given stack now has exactly one member, free it (a group of one is a
// standalone module). No-op for empty/missing ids or stacks with 2+ members.
function collapseStrayStack(branches: ModuleBranch[], stackId: string): ModuleBranch[] {
  if (!stackId) return branches;
  const members = branches.filter((m) => postStackId(m) === stackId);
  if (members.length !== 1) return branches;
  return branches.map((m) => (m.id === members[0].id ? withStackId(m, null) : m));
}

// Remove a posts module from its tab group (becomes standalone again). If only
// one module would remain in the group, that one is freed too — a group of one
// is just a standalone module.
function unmergePost(branches: ModuleBranch[], sourceId: string): ModuleBranch[] {
  const source = branches.find((m) => m.id === sourceId);
  if (!source) return branches;
  const stackId = postStackId(source);
  if (!stackId) return branches;

  let next = branches.map((m) => (m.id === sourceId ? withStackId(m, null) : m));
  const remaining = next.filter((m) => postStackId(m) === stackId);
  if (remaining.length === 1) {
    next = next.map((m) => (m.id === remaining[0].id ? withStackId(m, null) : m));
  }
  return next;
}

function preferredPostModuleId(modules: ModuleBranch[]) {
  return modules.find(isPostModuleConfigured)?.id || modules[0]?.id || '';
}

function isPostModuleConfigured(module: ModuleBranch) {
  if (module.moduleType !== 'rss') return true;
  const feeds = module.config?.feeds;
  if (Array.isArray(feeds)) return feeds.some((feed) => typeof feed === 'string' && feed.trim());
  return typeof feeds === 'string' && feeds.trim().length > 0;
}

function postModuleTabLabel(module: ModuleBranch) {
  const label = module.name || getModuleLabel(module.moduleType);
  return label.length > 18 ? getModuleLabel(module.moduleType) : label;
}

function isKnownModuleType(moduleType: string): moduleType is KnownModuleType {
  return Boolean((MODULE_LABELS as Record<string, string>)[moduleType]);
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

function moduleRefreshInterval(moduleType: string) {
  if (['plex', 'jellyfin', 'emby', 'radarr', 'sonarr'].includes(moduleType)) return 60_000;
  if (moduleType === 'weather') return 15 * 60_000;
  return 5 * 60_000;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatCalendarMonth(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function calendarCells(monthDate: Date) {
  const firstDay = startOfMonth(monthDate);
  const gridStart = new Date(firstDay);
  gridStart.setDate(1 - firstDay.getDay());
  const todayKey = dateKey(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = dateKey(date);

    return {
      key,
      date,
      inMonth: date.getMonth() === monthDate.getMonth(),
      isToday: key === todayKey,
    };
  });
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function calendarCellTitle(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatWeekday(date: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' })
    .format(new Date(`${date}T12:00:00`));
}

function formatMarketPrice(value: number, currency?: string) {
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: value >= 100 ? 2 : 4,
    }).format(value);
  }

  if (Math.abs(value) >= 1_000) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (Math.abs(value) >= 10) return value.toFixed(2);
  return value.toFixed(4);
}

function marketTrendTone(changePercent: number) {
  if (Math.abs(changePercent) < 0.005) return 'text-text-secondary';
  return changePercent > 0 ? 'text-accent-green-dark' : 'text-accent-red-dark';
}

function sparklinePoints(values: number[], width = 120, height = 28) {
  const points = values.filter((value) => Number.isFinite(value));
  if (points.length < 2) return '';

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xStep = width / (points.length - 1);

  return points.map((value, index) => {
    const x = index * xStep;
    const y = height - ((value - min) / span) * height;
    return `${roundSvgNumber(x)},${roundSvgNumber(y)}`;
  }).join(' ');
}

function roundSvgNumber(value: number) {
  return Math.round(value * 10) / 10;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCompactStatValue(value: string | number) {
  return typeof value === 'number' ? formatCompactNumber(value) : value;
}

function mediaStatValue(data: MediaModuleData, label: string) {
  return data.stats.find((stat) => stat.label.toLowerCase() === label.toLowerCase())?.value;
}

function toCount(value: string | number | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, value) : 0;
  if (typeof value !== 'string') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatRelativeTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return '';

  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const ranges: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.345, 'week'],
    [12, 'month'],
  ];

  let valueInUnit = seconds;
  for (const [divisor, unit] of ranges) {
    if (Math.abs(valueInUnit) < divisor) return formatter.format(Math.round(valueInUnit), unit);
    valueInUnit /= divisor;
  }
  return formatter.format(Math.round(valueInUnit), 'year');
}

function configText(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === 'string' ? value : '';
}

function configListText(
  config: Record<string, unknown>,
  key: string,
  separator = ', ',
) {
  const value = config[key];
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join(separator);
  return typeof value === 'string' ? value : '';
}

function configNumberValue(
  config: Record<string, unknown>,
  key: string,
  fallback: number,
) {
  const value = Number(config[key]);
  return Number.isFinite(value) ? value : fallback;
}

export default TreeModule;
