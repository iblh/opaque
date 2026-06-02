import React, { useMemo, useRef, useState } from 'react';
import {
  IconActivity,
  IconAntennaBars5,
  IconBrandReddit,
  IconCalendarEvent,
  IconChartLine,
  IconCloud,
  IconDeviceTv,
  IconGripVertical,
  IconMovie,
  IconNews,
  IconPhotoVideo,
  IconPlayerPlay,
  IconPlus,
  IconRss,
  IconTrash,
} from '@tabler/icons-react';
import { KnownModuleType, ModuleBranch } from '@/lib/types';
import {
  createDefaultModuleBranch,
  getAllowedModuleTypes,
  MODULE_LABELS,
} from '@/lib/modules';
import {
  getSpatialDropPlacement,
  setDragPreview,
  type DragPreviewState,
  type DropPlacement,
} from '@/lib/drag';

interface ModuleTree {
  root: string;
  branches: ModuleBranch[];
}

interface TreeModuleProps {
  tree: ModuleTree;
  isEditing?: boolean;
  onTreeChange?: (tree: ModuleTree) => void;
}

const moduleInputClass = 'opaque-input w-full focus:border-ink-700';

const TreeModule: React.FC<TreeModuleProps> = ({
  tree,
  isEditing = false,
  onTreeChange,
}) => {
  const allowedTypes = getAllowedModuleTypes(tree.root);
  const [newModuleType, setNewModuleType] = useState<KnownModuleType | ''>(
    allowedTypes[0] || '',
  );
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const draggedModuleId = useRef<string | null>(null);
  const draggedModulePreview = useRef<DragPreviewState | null>(null);

  const visibleModules = useMemo(() => (
    tree.branches.filter((module) => (
      isEditing || (module.enabled !== false && isKnownModuleType(module.moduleType))
    ))
  ), [isEditing, tree.branches]);

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

  const finishDrag = () => {
    draggedModuleId.current = null;
    draggedModulePreview.current = null;
    setActiveDragId(null);
  };

  const updateModule = (
    moduleId: string,
    updater: (module: ModuleBranch) => ModuleBranch,
  ) => {
    updateBranches(tree.branches.map((module) => (
      module.id === moduleId ? updater(module) : module
    )));
  };

  const addModule = (moduleType = newModuleType) => {
    if (!moduleType) return;
    updateBranches([...tree.branches, createDefaultModuleBranch(moduleType)]);
  };

  const removeModule = (moduleId: string) => {
    updateBranches(tree.branches.filter((module) => module.id !== moduleId));
  };

  if (!isEditing && visibleModules.length === 0) return null;

  return (
    <div className="relative grid w-full max-w-[90rem] flex-1 grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] items-start gap-3 px-4 md:px-8">
      {visibleModules.map((module) => {
        if (isEditing) {
          return (
            <div
              key={module.id}
              data-drag-preview
              className={`group border border-border-light bg-white p-3 transition-all duration-200 hover:border-border-medium ${
                activeDragId === module.id ? 'scale-[0.98] opacity-45' : ''
              }`}
              onDragOver={(event) => {
                if (!draggedModuleId.current) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                moveModule(module.id, getModuleDropPlacement(event));
              }}
              onDrop={(event) => {
                if (!draggedModuleId.current) return;
                event.preventDefault();
                moveModule(module.id, getModuleDropPlacement(event));
                finishDrag();
              }}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={(event) => {
                      draggedModuleId.current = module.id;
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', `module:${module.id}`);
                      draggedModulePreview.current = setDragPreview(event);
                      setActiveDragId(module.id);
                    }}
                    onDragEnd={finishDrag}
                    className="flex h-6 w-5 flex-shrink-0 cursor-grab items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text-primary"
                    aria-label={`Move ${module.name}`}
                    title="Move module"
                  >
                    <IconGripVertical className="h-4 w-4" />
                  </div>
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
                  onClick={() => removeModule(module.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-red-500"
                  aria-label={`Delete ${module.name}`}
                  title="Delete module"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                <input
                  value={module.name}
                  onChange={(event) => updateModule(module.id, (item) => ({
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
                    updateModule(module.id, (item) => ({
                      ...item,
                      moduleType,
                      name: nextModule.name,
                      config: nextModule.config,
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
                    onChange={(event) => updateModule(module.id, (item) => ({
                      ...item,
                      enabled: event.target.checked,
                    }))}
                    className="h-3 w-3 rounded-sm border-border-medium text-ink-700 focus:ring-0"
                  />
                  Enabled
                </label>
              </div>
            </div>
          );
        }

        return (
          <ModuleWidget key={module.id} module={module} />
        );
      })}

      {isEditing && allowedTypes.length > 0 && (
        <div className="flex min-h-[10rem] flex-col justify-between border border-dashed border-border-medium bg-white/60 p-3">
          <div>
            <div className="text-xs font-medium text-text-primary">
              Add module
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-text-tertiary">
              Thin mock data only. Real API credentials come later.
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <select
              value={newModuleType}
              onChange={(event) => setNewModuleType(event.target.value as KnownModuleType)}
              className={moduleInputClass}
            >
              {allowedTypes.map((moduleType) => (
                <option key={moduleType} value={moduleType}>
                  {MODULE_LABELS[moduleType]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => addModule()}
              className="opaque-icon-button flex-shrink-0"
              aria-label="Add module"
              title="Add module"
            >
              <IconPlus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function ModuleWidget({ module }: { module: ModuleBranch }) {
  switch (module.moduleType) {
    case 'weather':
      return <WeatherWidget module={module} />;
    case 'calendar':
      return <CalendarWidget module={module} />;
    case 'markets':
      return <MarketsWidget module={module} />;
    case 'plex':
    case 'jellyfin':
    case 'emby':
    case 'radarr':
    case 'sonarr':
      return <MediaWidget module={module} />;
    case 'rss':
    case 'reddit':
    case 'hacker-news':
      return <PostsWidget module={module} />;
    default:
      return null;
  }
}

function ModulePanel({
  module,
  children,
}: {
  module: ModuleBranch;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border-light bg-white p-3 transition-colors duration-200 hover:border-border-medium hover:bg-[#fcfcfc]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ModuleIcon moduleType={module.moduleType} className="h-4 w-4 text-text-secondary" />
          <div className="truncate text-xs font-medium text-text-primary">
            {module.name || getModuleLabel(module.moduleType)}
          </div>
        </div>
        <div className="h-1.5 w-1.5 rounded-full bg-accent-green" />
      </div>
      {children}
    </section>
  );
}

function WeatherWidget({ module }: { module: ModuleBranch }) {
  return (
    <ModulePanel module={module}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-light leading-none tracking-tight text-text-primary">
            67°
          </div>
          <div className="mt-2 text-xs text-text-tertiary">
            Partly cloudy
          </div>
        </div>
        <div className="font-mono text-[10px] text-text-tertiary">
          SF · 61%
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border-light pt-3">
        {[
          ['Mon', '69', '55'],
          ['Tue', '65', '53'],
          ['Wed', '71', '56'],
        ].map(([day, high, low]) => (
          <div key={day}>
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary">{day}</div>
            <div className="mt-1 font-mono text-[11px] text-text-secondary">{high}/{low}</div>
          </div>
        ))}
      </div>
    </ModulePanel>
  );
}

function CalendarWidget({ module }: { module: ModuleBranch }) {
  return (
    <ModulePanel module={module}>
      <div className="space-y-3">
        {[
          ['09:30', 'Design review'],
          ['13:00', 'Infra check-in'],
          ['16:20', 'Release notes'],
        ].map(([time, title]) => (
          <div key={title} className="flex items-baseline gap-3">
            <div className="w-10 font-mono text-[10px] text-text-tertiary">{time}</div>
            <div className="min-w-0 flex-1 truncate text-xs text-text-primary">{title}</div>
          </div>
        ))}
      </div>
    </ModulePanel>
  );
}

function MarketsWidget({ module }: { module: ModuleBranch }) {
  return (
    <ModulePanel module={module}>
      <div className="space-y-3">
        {[
          ['SPY', '624.18', '+0.8%', '62%'],
          ['AAPL', '214.62', '-0.2%', '46%'],
          ['NVDA', '182.40', '+1.4%', '76%'],
          ['BTC', '108.2k', '+2.1%', '83%'],
        ].map(([symbol, price, change, width]) => (
          <div key={symbol}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <div className="font-mono text-[11px] text-text-primary">{symbol}</div>
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <span className="text-text-tertiary">{price}</span>
                <span className={change.startsWith('+') ? 'text-accent-green' : 'text-red-500'}>
                  {change}
                </span>
              </div>
            </div>
            <div className="h-1 bg-surface-sunken">
              <div className="h-full bg-ink-500" style={{ width }} />
            </div>
          </div>
        ))}
      </div>
    </ModulePanel>
  );
}

function MediaWidget({ module }: { module: ModuleBranch }) {
  const rows = getMediaRows(module.moduleType);

  return (
    <ModulePanel module={module}>
      <div className="mb-4 flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-wider text-accent-green">
          online
        </div>
        <div className="font-mono text-[10px] text-text-tertiary">
          mock
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
              {label}
            </div>
            <div className="mt-1 truncate text-sm font-medium text-text-primary">
              {value}
            </div>
          </div>
        ))}
      </div>
    </ModulePanel>
  );
}

function PostsWidget({ module }: { module: ModuleBranch }) {
  const posts = getPostRows(module.moduleType);

  return (
    <ModulePanel module={module}>
      <div className="space-y-3">
        {posts.map((post) => (
          <a
            key={post.title}
            href="#"
            className="group block text-inherit no-underline"
          >
            <div className="line-clamp-2 text-xs leading-relaxed text-text-primary transition-colors group-hover:text-ink-800">
              {post.title}
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-text-tertiary">
              <span>{post.source}</span>
              <span>·</span>
              <span>{post.meta}</span>
            </div>
          </a>
        ))}
      </div>
    </ModulePanel>
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

function getModuleLabel(moduleType: string) {
  return (MODULE_LABELS as Record<string, string>)[moduleType] || 'Unknown module';
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

function getMediaRows(moduleType: string): [string, string][] {
  switch (moduleType) {
    case 'radarr':
      return [['Monitored', '482'], ['Missing', '17'], ['Queue', '2'], ['Recent', 'Dune']];
    case 'sonarr':
      return [['Series', '92'], ['Episodes', '8.4k'], ['Queue', '5'], ['Recent', 'Severance']];
    case 'jellyfin':
      return [['Libraries', '7'], ['Items', '18k'], ['Streams', '2'], ['Recent', 'Foundation']];
    case 'emby':
      return [['Libraries', '5'], ['Items', '11k'], ['Streams', '1'], ['Recent', 'Arrival']];
    case 'plex':
    default:
      return [['Libraries', '9'], ['Items', '24k'], ['Streams', '3'], ['Recent', 'Andor']];
  }
}

function getPostRows(moduleType: string) {
  if (moduleType === 'hacker-news') {
    return [
      { title: 'SQLite on the edge, without a server', source: 'HN', meta: '428 pts · 91 comments' },
      { title: 'A visual guide to DNS propagation', source: 'HN', meta: '211 pts · 32 comments' },
      { title: 'Why small tools survive rewrites', source: 'HN', meta: '168 pts · 45 comments' },
      { title: 'Show HN: A tiny dashboard for homelabs', source: 'HN', meta: '104 pts · 17 comments' },
      { title: 'Postgres indexing mistakes I keep seeing', source: 'HN', meta: '86 pts · 14 comments' },
    ];
  }

  if (moduleType === 'reddit') {
    return [
      { title: 'What are you using for a home dashboard in 2026?', source: 'r/selfhosted', meta: '214 upvotes' },
      { title: 'Moving media services behind a private gateway', source: 'r/homelab', meta: '93 upvotes' },
      { title: 'Best approach for remote server metrics?', source: 'r/selfhosted', meta: '71 upvotes' },
      { title: 'Small NAS, big monitoring stack', source: 'r/homelab', meta: '42 upvotes' },
      { title: 'RSS readers that still feel fast', source: 'r/rss', meta: '38 upvotes' },
    ];
  }

  return [
    { title: 'Minimal interfaces for daily operations', source: 'RSS', meta: '12m ago' },
    { title: 'Designing dashboards that stay quiet', source: 'RSS', meta: '48m ago' },
    { title: 'Agent push metrics for remote servers', source: 'RSS', meta: '1h ago' },
    { title: 'A practical guide to media automation', source: 'RSS', meta: '2h ago' },
    { title: 'Building with fewer panels and better defaults', source: 'RSS', meta: '3h ago' },
  ];
}

export default TreeModule;
