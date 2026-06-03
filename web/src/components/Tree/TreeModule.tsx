import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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
  CalendarModuleData,
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
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const calendarMonthKey = formatMonthKey(calendarMonth);
  const state = useModuleData(
    module,
    module.moduleType === 'calendar'
      ? `month=${encodeURIComponent(calendarMonthKey)}`
      : '',
  );

  switch (module.moduleType) {
    case 'weather':
      return <WeatherWidget module={module} state={state} />;
    case 'calendar':
      return (
        <CalendarWidget
          module={module}
          state={state}
          visibleMonth={calendarMonth}
          onMonthChange={setCalendarMonth}
        />
      );
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

function useModuleData(module: ModuleBranch, queryString = ''): ModuleDataState {
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
        const response = await fetch(`/api/modules/data?moduleId=${encodeURIComponent(module.id)}${queryString ? `&${queryString}` : ''}`, {
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
  }, [configKey, module.id, module.moduleType, queryString, requestVersion]);

  return { data, error, isLoading, refresh };
}

function ModulePanel({
  module,
  state,
  href,
  children,
}: {
  module: ModuleBranch;
  state: ModuleDataState;
  href?: string;
  children: React.ReactNode;
}) {
  const statusClass = state.error
    ? 'bg-red-500'
    : state.isLoading
      ? 'bg-ink-300'
      : 'bg-accent-green';
  const title = module.name || getModuleLabel(module.moduleType);

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
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-3xl font-light leading-none tracking-tight text-text-primary">
                {Math.round(data.temperature)}°
              </div>
              <div className="mt-2 text-xs text-text-tertiary">
                {data.condition}
              </div>
            </div>
            <div className="max-w-[8rem] truncate text-right font-mono text-[10px] text-text-tertiary">
              {data.location} · {Math.round(data.humidity)}%
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border-light pt-3">
            {data.forecast.map((day) => (
              <div key={day.date} title={day.condition}>
                <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                  {formatWeekday(day.date)}
                </div>
                <div className="mt-1 font-mono text-[11px] text-text-secondary">
                  {Math.round(day.high)}/{Math.round(day.low)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ModulePanel>
  );
}

function CalendarWidget({
  module,
  state,
  visibleMonth,
  onMonthChange,
}: {
  module: ModuleBranch;
  state: ModuleDataState;
  visibleMonth: Date;
  onMonthChange: (date: Date) => void;
}) {
  const data = state.data?.kind === 'calendar' ? state.data as CalendarModuleData : null;
  const monthDate = monthKeyToDate(data?.month) || visibleMonth;
  const cells = useMemo(() => calendarCells(monthDate), [monthDate]);
  const eventsByDay = useMemo(() => groupEventsByDay(data?.events || []), [data?.events]);
  const monthEventCount = data?.events.length || 0;
  const footerMessage = state.error
    || (state.isLoading ? 'Loading calendar events...' : '')
    || (monthEventCount === 0
      ? 'No events on this calendar for the visible month.'
      : `${monthEventCount} event${monthEventCount === 1 ? '' : 's'} on this calendar for the visible month.`);

  const moveMonth = (offset: number) => {
    onMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1));
  };

  return (
    <ModulePanel module={module} state={state}>
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-2xl font-semibold tracking-tight text-text-primary">
            {formatCalendarMonth(monthDate)}
          </div>
          <div className="flex items-center gap-1 text-text-muted">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-sunken hover:text-text-primary"
              aria-label="Previous month"
              title="Previous month"
            >
              &lsaquo;
            </button>
            <button
              type="button"
              onClick={() => onMonthChange(startOfMonth(new Date()))}
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-sunken hover:text-text-primary"
              aria-label="Current month"
              title="Current month"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-current" />
            </button>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-sunken hover:text-text-primary"
              aria-label="Next month"
              title="Next month"
            >
              &rsaquo;
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday, index) => (
            <div key={`${weekday}-${index}`} className="pb-2 text-[11px] font-semibold text-text-primary">
              {weekday}
            </div>
          ))}
          {cells.map((cell) => {
            const events = eventsByDay.get(cell.key) || [];
            const eventDots = events.slice(0, 3);
            return (
              <button
                key={cell.key}
                type="button"
                className={`group relative mx-auto flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                  cell.inMonth
                    ? 'text-text-primary hover:bg-surface-sunken'
                    : 'text-text-muted/50 hover:bg-surface-sunken/60'
                } ${cell.isToday ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white' : ''}`}
                title={calendarCellTitle(cell.date, events)}
                aria-label={calendarCellTitle(cell.date, events)}
              >
                <span>{cell.date.getDate()}</span>
                {eventDots.length > 0 && (
                  <span className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                    {eventDots.map((event) => (
                      <span key={event.id} className="h-1 w-1 rounded-full bg-ink-700" />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className={`mt-4 border-t border-border-light pt-3 text-[11px] leading-relaxed ${state.error ? 'text-red-500' : 'text-text-tertiary'}`}>
          {footerMessage}
        </div>
      </div>
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
        <div className="space-y-3">
          {data.quotes.map((quote) => {
            const change = `${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`;
            const width = `${Math.max(8, Math.min(100, 50 + quote.changePercent * 8))}%`;

            return (
              <div key={quote.symbol}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div className="font-mono text-[11px] text-text-primary">{quote.symbol}</div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-text-tertiary">{formatMarketPrice(quote.price)}</span>
                    <span className={quote.changePercent >= 0 ? 'text-accent-green' : 'text-red-500'}>
                      {change}
                    </span>
                  </div>
                </div>
                <div className="h-1 bg-surface-sunken">
                  <div className="h-full bg-ink-500" style={{ width }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ModulePanel>
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
          <div className="grid grid-cols-2 gap-3">
            {data.stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                  {stat.label}
                </div>
                <div className="mt-1 truncate text-sm font-medium text-text-primary">
                  {typeof stat.value === 'number' ? formatCompactNumber(stat.value) : stat.value}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ModulePanel>
  );
}

function PostsWidget({ module, state }: { module: ModuleBranch; state: ModuleDataState }) {
  const data = state.data?.kind === 'posts' ? state.data as PostsModuleData : null;

  return (
    <ModulePanel module={module} state={state}>
      {!data ? (
        <ModuleBodyState state={state} />
      ) : data.posts.length === 0 ? (
        <EmptyModuleState>No posts found.</EmptyModuleState>
      ) : (
        <div className="space-y-3">
          {data.posts.map((post) => (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noreferrer"
              className="group block text-inherit no-underline"
            >
              <div className="line-clamp-2 text-xs leading-relaxed text-text-primary transition-colors group-hover:text-ink-800">
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
      )}
    </ModulePanel>
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
        <>
          <ConfigInput
            label="iCalendar URL"
            value={configText(config, 'url')}
            placeholder="https://.../calendar.ics"
            onChange={(value) => setValue('url', value)}
          />
        </>
      );
      break;
    case 'markets':
      fields = (
        <ConfigInput
          label="Symbols"
          value={configListText(config, 'symbols')}
          placeholder="SPY, AAPL, NVDA, BTC-USD"
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
      <div className="text-[10px] leading-relaxed text-text-muted">
        Live data refreshes after the dashboard is saved.
      </div>
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

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthKeyToDate(monthKey: string | undefined) {
  if (!monthKey) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (!Number.isFinite(year) || month < 0 || month > 11) return null;

  return new Date(year, month, 1);
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

function groupEventsByDay(events: CalendarModuleData['events']) {
  const groups = new Map<string, CalendarModuleData['events']>();
  for (const event of events) {
    const key = dateKey(new Date(event.start));
    const dayEvents = groups.get(key) || [];
    dayEvents.push(event);
    groups.set(key, dayEvents);
  }

  return groups;
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function calendarCellTitle(date: Date, events: CalendarModuleData['events']) {
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

  if (events.length === 0) return dateLabel;
  return [
    dateLabel,
    ...events.map((event) => `${calendarEventTime(event)} ${event.title}`.trim()),
  ].join('\n');
}

function calendarEventTime(event: CalendarModuleData['events'][number]) {
  if (event.allDay) return 'All day';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(event.start));
}

function formatWeekday(date: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' })
    .format(new Date(`${date}T12:00:00`));
}

function formatMarketPrice(value: number) {
  if (Math.abs(value) >= 100_000) return `${(value / 1000).toFixed(1)}k`;
  if (Math.abs(value) >= 1_000) return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (Math.abs(value) >= 10) return value.toFixed(2);
  return value.toFixed(4);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
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
