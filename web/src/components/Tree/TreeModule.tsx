import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  IconActivity,
  IconAntennaBars5,
  IconBrandReddit,
  IconCalendarEvent,
  IconChartLine,
  IconCloud,
  IconDeviceTv,
  IconGripVertical,
  IconHelpCircle,
  IconMovie,
  IconNews,
  IconPhotoVideo,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconRss,
  IconTrash,
} from '@tabler/icons-react';
import type {
  MarketsModuleData,
  MediaModuleData,
  ModuleData,
  ModuleDataResponse,
  PostsModuleData,
  WeatherModuleData,
} from '@/lib/moduleData';
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
const moduleLabelClass = 'block text-[10px] uppercase tracking-wider text-text-tertiary';
const moduleGridBaseClass = 'relative grid w-full max-w-[90rem] flex-1 items-start justify-start gap-3 px-4 md:px-8';

function moduleGridClassName(root: string, isEditing: boolean) {
  if (root === 'posts' && !isEditing) {
    return `${moduleGridBaseClass} grid-cols-[repeat(auto-fill,minmax(min(100%,732px),732px))]`;
  }

  return `${moduleGridBaseClass} grid-cols-[repeat(auto-fill,minmax(min(100%,360px),360px))]`;
}

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
  const gridClassName = moduleGridClassName(tree.root, isEditing);

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

  if (!isEditing && tree.root === 'posts') {
    return (
      <div className={gridClassName}>
        <PostsStackWidget modules={visibleModules} />
      </div>
    );
  }

  return (
    <div className={gridClassName}>
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
                {isKnownModuleType(module.moduleType) && (
                  <ModuleConfigFields
                    module={module}
                    onChange={(config) => updateModule(module.id, (item) => ({
                      ...item,
                      config,
                    }))}
                  />
                )}
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
              Configure the module, save the dashboard, then live data will load here.
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
                cell.inMonth ? 'text-text-primary' : 'text-text-muted/45'
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

function useModuleData(module: ModuleBranch): ModuleDataState {
  const [data, setData] = useState<ModuleData | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);
  const configKey = JSON.stringify(module.config || {});
  const refresh = useCallback(() => setRequestVersion((version) => version + 1), []);

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
          setData((payload as ModuleDataResponse).data);
        }
      } catch (loadError) {
        if (!cancelled && !controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load module data.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    const intervalId = window.setInterval(() => load(true), moduleRefreshInterval(module.moduleType));

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [configKey, module.id, module.moduleType, requestVersion]);

  return { data, error, isLoading, refresh };
}

function ModulePanel({
  module,
  state,
  href,
  titleOverride,
  children,
}: {
  module: ModuleBranch;
  state?: ModuleDataState;
  href?: string;
  titleOverride?: string;
  children: React.ReactNode;
}) {
  const statusClass = state?.error
    ? 'bg-red-500'
    : state?.isLoading
      ? 'bg-ink-300'
      : 'bg-accent-green';
  const title = titleOverride || module.name || getModuleLabel(module.moduleType);

  return (
    <section className="border border-border-light bg-white p-3 transition-colors duration-200 hover:border-border-medium hover:bg-[#fcfcfc]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ModuleIcon moduleType={module.moduleType} className="h-4 w-4 text-text-secondary" />
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="truncate text-xs font-medium text-text-primary no-underline hover:text-ink-800"
            >
              {title}
            </a>
          ) : (
            <div className="truncate text-xs font-medium text-text-primary">
              {title}
            </div>
          )}
        </div>
        {state && (
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
        )}
      </div>
      {children}
    </section>
  );
}

function WeatherWidget({ module, state }: { module: ModuleBranch; state: ModuleDataState }) {
  const data = state.data?.kind === 'weather' ? state.data as WeatherModuleData : null;

  return (
    <ModulePanel module={module} state={state}>
      {!data ? (
        <ModuleBodyState state={state} />
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
        <ModuleBodyState state={state} />
      ) : (
        <div className="-my-1 divide-y divide-border-light">
          {data.quotes.map((quote) => {
            const change = `${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`;
            const trendTone = marketTrendTone(quote.changePercent);

            return (
              <div
                key={quote.symbol}
                className="grid grid-cols-[minmax(4.75rem,0.9fr)_minmax(4.25rem,1fr)_minmax(4.5rem,auto)] items-center gap-3 py-2.5"
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
  const points = sparklinePoints(values, 96, 34);

  if (!points) {
    return <div className="h-9" />;
  }

  return (
    <div className="h-9 min-w-0 overflow-hidden">
      <svg
        viewBox="0 0 96 34"
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

  return (
    <ModulePanel module={module} state={state} href={data?.url}>
      {!data ? (
        <ModuleBodyState state={state} />
      ) : (
        <>
          <div className="mb-4 flex items-baseline justify-between">
            <div className="font-mono text-[10px] uppercase tracking-wider text-accent-green">
              {data.status}
            </div>
            <div className="font-mono text-[10px] text-text-tertiary">
              {data.detail || data.service}
            </div>
          </div>
          {data.libraries && data.libraries.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 border-b border-border-light pb-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                    Libraries
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-text-secondary">
                    {data.libraries.length} total
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                    Streaming
                  </div>
                  <div className="mt-1 font-mono text-[11px] font-medium text-text-primary">
                    {formatCompactStatValue(mediaStatValue(data, 'Streams') ?? 0)}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                {data.libraries.map((library) => (
                  <div key={library.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs text-text-primary">
                        {library.name}
                      </div>
                      {library.type && (
                        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-text-muted">
                          {library.type}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 font-mono text-[11px] text-text-secondary">
                      {formatCompactNumber(library.count)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {data.stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                    {stat.label}
                  </div>
                  <div className="mt-1 truncate text-sm font-medium text-text-primary">
                    {formatCompactStatValue(stat.value)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.recent && data.recent.length > 0 && (
            <div className="mt-4 border-t border-border-light pt-3">
              <div className="mb-2 text-[10px] uppercase tracking-wider text-text-tertiary">
                Recent
              </div>
              <div className="grid grid-cols-4 gap-2">
                {data.recent.map((item) => (
                  <div key={item.id} className="min-w-0">
                    <div className="aspect-[2/3] overflow-hidden border border-border-light bg-surface-sunken">
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
                    </div>
                    <div className="mt-1 truncate text-[10px] font-medium text-text-primary">
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div className="truncate font-mono text-[9px] text-text-tertiary">
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </ModulePanel>
  );
}

function PostsStackWidget({ modules }: { modules: ModuleBranch[] }) {
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
    <ModulePanel module={selectedModule} state={state} titleOverride="Posts">
      <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-border-light pb-2">
        {modules.map((source) => {
          const isSelected = source.id === selectedModule.id;
          return (
            <button
              key={source.id}
              type="button"
              onClick={() => onSelect(source.id)}
              className={`border px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                isSelected
                  ? 'border-ink-700 bg-ink-700 text-white'
                  : 'border-border-light text-text-tertiary hover:border-border-medium hover:text-text-primary'
              }`}
            >
              {postModuleTabLabel(source)}
            </button>
          );
        })}
      </div>
      <PostsContent data={data} state={state} />
    </ModulePanel>
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

function PostsContent({
  data,
  state,
}: {
  data: PostsModuleData | null;
  state: ModuleDataState;
}) {
  if (!data) return <ModuleBodyState state={state} />;
  if (data.posts.length === 0) return <EmptyModuleState>No posts found.</EmptyModuleState>;

  return (
    <div className="space-y-3">
      {data.posts.map((post) => (
        <a
          key={post.id}
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className="group block text-inherit no-underline"
        >
          <div className="line-clamp-2 border-b border-transparent pb-0.5 text-xs leading-relaxed text-text-primary transition-colors group-hover:border-ink-700 group-hover:text-ink-800">
            {post.title}
          </div>
          <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-text-tertiary">
            <span>{post.source}</span>
            {(post.meta || post.publishedAt) && <span>·</span>}
            {post.meta && <span className="truncate">{post.meta}</span>}
            {post.publishedAt && <span className="flex-shrink-0">{formatRelativeTime(post.publishedAt)}</span>}
          </div>
        </a>
      ))}
    </div>
  );
}

function ModuleBodyState({ state }: { state: ModuleDataState }) {
  return (
    <div className={`min-h-16 text-[11px] leading-relaxed ${state.error ? 'text-red-500' : 'text-text-tertiary'}`}>
      {state.error || 'Loading live data...'}
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
            className="flex h-4 w-4 items-center justify-center rounded-full text-text-muted hover:bg-surface-sunken hover:text-text-primary focus:outline-none focus:ring-1 focus:ring-ink-500"
            aria-label={`${label} help`}
          >
            <IconHelpCircle className="h-3 w-3" />
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 border border-border-medium bg-white p-2 text-[10px] normal-case leading-relaxed tracking-normal text-text-secondary opacity-0 shadow-sm transition-opacity group-hover/help:opacity-100 group-focus-within/help:opacity-100"
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

function getModuleLabel(moduleType: string) {
  return (MODULE_LABELS as Record<string, string>)[moduleType] || 'Unknown module';
}

function isPostModuleType(moduleType: string) {
  return ['rss', 'reddit', 'hacker-news'].includes(moduleType);
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
