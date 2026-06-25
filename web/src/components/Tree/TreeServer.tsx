import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconCopy,
  IconGripVertical,
  IconKey,
  IconPencil,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { ServerBranch, ServerMetricHistory, ServerMetricSample, ServerStats } from '@/lib/types';
import {
  getSpatialDropPlacement,
  setDragPreview,
  type DragPreviewState,
  type DropPlacement,
} from '@/lib/drag';
import SvgIcon from '@/components/SvgIcon';
import { DEFAULT_SERVER_ICON } from '@/lib/svg';
import { SERVER_ICON_PRESETS } from '@/lib/iconPresets';
import IconField from '@/components/IconField';
import SectionAddControl from '@/components/Tree/SectionAddControl';

interface ServerTree {
  root: string;
  branches: ServerBranch[];
}

interface TreeServerProps {
  tree: ServerTree;
  isEditing?: boolean;
  onTreeChange?: (tree: ServerTree) => void;
}

const emptyStats: ServerStats = {
  status: 'offline',
  uptime: 'unknown',
  cpu: 0,
  memory: {
    used: 0,
    total: 0,
  },
  disk: {
    used: 0,
    total: 0,
  },
  network: {
    in: 0,
    out: 0,
  },
  temperature: 0,
};

const SERVER_HISTORY_POLL_INTERVAL_MS = 60_000;

const TreeServer: React.FC<TreeServerProps> = ({
  tree,
  isEditing = false,
  onTreeChange,
}) => {
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [rotatingTokenId, setRotatingTokenId] = useState<string | null>(null);
  const [agentTokens, setAgentTokens] = useState<Record<string, string>>({});
  const [agentTokenErrors, setAgentTokenErrors] = useState<Record<string, string>>({});
  const [metricHistories, setMetricHistories] = useState<Record<string, ServerMetricSample[]>>({});
  const draggedServerId = useRef<string | null>(null);
  const draggedServerPreview = useRef<DragPreviewState | null>(null);
  const historyServerKey = useMemo(
    () => tree.branches.map((server) => server.id).filter(Boolean).join('|'),
    [tree.branches],
  );
  const serverInputClass =
    'opaque-input w-full focus:border-ink-700';
  const monoServerInputClass = `${serverInputClass} font-mono text-[11px]`;

  useEffect(() => {
    if (isEditing || !historyServerKey) {
      if (!historyServerKey) setMetricHistories({});
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();
    const serverIds = historyServerKey.split('|').filter(Boolean);

    const fetchHistories = async () => {
      const entries = await Promise.all(serverIds.map(async (serverId) => {
        try {
          const params = new URLSearchParams({ serverId, range: '24h' });
          const response = await fetch(`/api/server/metrics/history?${params.toString()}`, {
            cache: 'no-store',
            signal: controller.signal,
          });

          if (!response.ok) return [serverId, []] as const;

          const body = await response.json() as ServerMetricHistory;
          return [
            serverId,
            Array.isArray(body.samples) ? body.samples : [],
          ] as const;
        } catch {
          return [serverId, []] as const;
        }
      }));

      if (!isCancelled) {
        setMetricHistories(Object.fromEntries(entries));
      }
    };

    fetchHistories();
    const intervalId = window.setInterval(fetchHistories, SERVER_HISTORY_POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [historyServerKey, isEditing]);

  const updateBranches = (branches: ServerBranch[]) => {
    onTreeChange?.({ ...tree, branches });
  };

  const updateServer = (
    serverId: string,
    updater: (server: ServerBranch) => ServerBranch,
  ) => {
    updateBranches(tree.branches.map((server) => (
      server.id === serverId ? updater(server) : server
    )));
  };

  const addServer = () => {
    const id = newId();

    updateBranches([
      ...tree.branches,
      {
        id,
        name: 'New server',
        url: 'ssh://',
        icon: DEFAULT_SERVER_ICON,
        stats: emptyStats,
      },
    ]);
    setEditingServerId(id);
  };

  const removeServer = (serverId: string) => {
    updateBranches(tree.branches.filter((server) => server.id !== serverId));
  };

  const moveServer = (targetServerId: string, placement: DropPlacement) => {
    const sourceServerId = draggedServerId.current;
    if (!sourceServerId || sourceServerId === targetServerId) return;

    const sourceIndex = tree.branches.findIndex((server) => server.id === sourceServerId);
    const targetIndex = tree.branches.findIndex((server) => server.id === targetServerId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextBranches = reorder(tree.branches, sourceIndex, targetIndex, placement);
    if (sameOrder(tree.branches, nextBranches)) return;

    updateBranches(nextBranches);
  };

  const getServerDropPlacement = (event: React.DragEvent<HTMLElement>) => {
    return getSpatialDropPlacement(event, draggedServerPreview.current);
  };

  const finishDrag = () => {
    draggedServerId.current = null;
    draggedServerPreview.current = null;
    setActiveDragId(null);
  };

  const copyAgentId = async (serverId: string) => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(serverId);
  };

  const copyAgentToken = async (serverId: string) => {
    const token = agentTokens[serverId];
    if (!navigator.clipboard || !token) return;
    await navigator.clipboard.writeText(token);
  };

  const rotateAgentToken = async (serverId: string) => {
    setRotatingTokenId(serverId);
    setAgentTokenErrors((current) => ({ ...current, [serverId]: '' }));

    try {
      const response = await fetch('/api/server/token/rotate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverId }),
      });
      const result = await response.json();

      if (!response.ok) {
        setAgentTokenErrors((current) => ({
          ...current,
          [serverId]: result.error || 'Failed to rotate token',
        }));
        return;
      }

      setAgentTokens((current) => ({
        ...current,
        [serverId]: result.token,
      }));
    } catch (error) {
      setAgentTokenErrors((current) => ({
        ...current,
        [serverId]: 'Network error',
      }));
    } finally {
      setRotatingTokenId(null);
    }
  };

  const renderDragHandle = (server: ServerBranch) => {
    if (!isEditing) return null;

    return (
      <div
        role="button"
        tabIndex={0}
        draggable
        onDragStart={(event) => {
          draggedServerId.current = server.id;
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', `server:${server.id}`);
          draggedServerPreview.current = setDragPreview(event);
          setActiveDragId(server.id);
        }}
        onDragEnd={finishDrag}
        className="flex h-7 w-5 flex-shrink-0 cursor-grab items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text-primary"
        aria-label={`Move ${server.name}`}
        title="Move server"
      >
        <IconGripVertical className="h-4 w-4" />
      </div>
    );
  };

  return (
    <div className="relative flex w-full max-w-[90rem] flex-1 flex-wrap items-start gap-3">
      {isEditing && (
        <div className="pointer-events-none absolute -top-8 right-0 z-10">
          <div className="pointer-events-auto">
            <SectionAddControl label="Add server" onAdd={addServer} />
          </div>
        </div>
      )}
      {tree.branches.map((server) => {
        const stats = resolveStats(server.stats);
        const memoryPercent = percent(stats.memory.used, stats.memory.total);
        const diskPercent = percent(stats.disk.used, stats.disk.total);
        const isServerEditing = editingServerId === server.id;
        const isStale = isStatsStale(stats);

        return (
          <div
            key={server.id}
            data-drag-preview
            className={`relative w-[390px] max-w-full flex-none rounded-sm p-3.5 transition-all ${
              isServerEditing
                ? 'bg-surface-sunken/60'
                : 'hover:bg-surface-sunken/50'
            } ${
              activeDragId === server.id ? 'scale-[0.98] opacity-45' : ''
            }`}
            onDragOver={(event) => {
              if (!isEditing || !draggedServerId.current) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              moveServer(server.id, getServerDropPlacement(event));
            }}
            onDrop={(event) => {
              if (!isEditing || !draggedServerId.current) return;
              event.preventDefault();
              moveServer(server.id, getServerDropPlacement(event));
              finishDrag();
            }}
          >
            {isEditing && isServerEditing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {renderDragHandle(server)}
                  <input
                    value={server.name}
                    onChange={(event) => updateServer(server.id, (item) => ({
                      ...item,
                      name: event.target.value,
                    }))}
                    placeholder="Name"
                    className={serverInputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeServer(server.id)}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-accent-red-dark"
                    aria-label={`Delete ${server.name}`}
                    title="Delete server"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  value={server.url}
                  onChange={(event) => updateServer(server.id, (item) => ({
                    ...item,
                    url: event.target.value,
                  }))}
                  placeholder="URL"
                  className={monoServerInputClass}
                />
                <IconField
                  value={server.icon}
                  fallback={DEFAULT_SERVER_ICON}
                  presets={SERVER_ICON_PRESETS}
                  inputClassName={monoServerInputClass}
                  onChange={(icon) => updateServer(server.id, (item) => ({
                    ...item,
                    icon,
                  }))}
                />
                <div className="rounded-sm border border-border-light bg-surface-elevated px-2 py-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">Agent id</div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-secondary">
                      {server.id}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyAgentId(server.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text-primary"
                      aria-label="Copy agent id"
                      title="Copy agent id"
                    >
                      <IconCopy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="rounded-sm border border-border-light bg-surface-elevated px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] uppercase tracking-wider text-text-muted">Agent token</div>
                    <button
                      type="button"
                      onClick={() => rotateAgentToken(server.id)}
                      disabled={rotatingTokenId === server.id}
                      className="flex h-6 items-center gap-1 rounded-sm px-2 text-[11px] text-text-secondary hover:bg-surface-sunken hover:text-text-primary disabled:opacity-50"
                    >
                      {rotatingTokenId === server.id ? (
                        <IconRefresh className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <IconKey className="h-3.5 w-3.5" />
                      )}
                      Rotate
                    </button>
                  </div>
                  {agentTokens[server.id] && (
                    <div className="mt-1 flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-secondary">
                        {agentTokens[server.id]}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyAgentToken(server.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text-primary"
                        aria-label="Copy agent token"
                        title="Copy agent token"
                      >
                        <IconCopy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {agentTokenErrors[server.id] && (
                    <div className="mt-1 text-[11px] leading-relaxed text-accent-red-dark">
                      {agentTokenErrors[server.id]}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3.5 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {renderDragHandle(server)}
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm border border-border-light bg-surface-elevated text-text-secondary">
                      <SvgIcon svg={server.icon} fallback={DEFAULT_SERVER_ICON} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium leading-tight text-text-primary">
                        {server.name}
                      </div>
                      <div className="mt-1 truncate font-mono text-xs leading-tight text-text-tertiary">
                        {removeProtocol(server.url)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ServerStatusBadge online={stats.status === 'online' && !isStale} />
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => setEditingServerId(server.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text-primary"
                        aria-label={`Edit ${server.name}`}
                        title="Edit server"
                      >
                        <IconPencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <ServerUsageCard label="CPU" valueLabel={`${stats.cpu.toFixed(1)}%`} percent={stats.cpu} />
                  <ServerUsageCard label="Memory" valueLabel={`${memoryPercent}%`} percent={memoryPercent} />
                  <ServerUsageCard label="Storage" valueLabel={`${diskPercent}%`} percent={diskPercent} />
                  <ServerLoadCard stats={stats} />
                </div>

                <ServerFactChips stats={stats} />

                {!isEditing && (
                  <ServerTrendPanel
                    samples={metricHistories[server.id] || []}
                    stats={stats}
                  />
                )}
              </>
            )}
          </div>
        );
      })}

    </div>
  );
};

function ServerStatusBadge({ online }: { online: boolean }) {
  return (
    <div
      className={`inline-flex h-5 items-center gap-1.5 rounded-sm border px-1.5 font-condensed text-[10px] font-medium uppercase tracking-[0.14em] ${
        online
          ? 'border-accent-green/25 bg-accent-green/10 text-accent-green-dark'
          : 'border-border-light bg-surface-sunken/45 text-text-muted'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-accent-green' : 'bg-ink-300'}`} />
      {online ? 'online' : 'stale'}
    </div>
  );
}

function ServerUsageCard({
  label,
  valueLabel,
  percent: rawPercent,
}: {
  label: string;
  valueLabel: string;
  percent: number;
}) {
  const normalized = Math.max(0, Math.min(100, rawPercent));

  return (
    <div className="rounded-sm border border-border-light bg-surface-sunken/35 p-2">
      <div className="flex items-center justify-between">
        <div className="opaque-spec-label">{label}</div>
        <div className="font-mono text-[11px] font-medium text-text-primary">{valueLabel}</div>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border-light">
        <div
          className={`h-full rounded-full transition-all ${normalized < 70 ? 'bg-accent-green' : normalized < 90 ? 'bg-accent-amber' : 'bg-accent-red'}`}
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
}

function ServerLoadCard({ stats }: { stats: ServerStats }) {
  return (
    <div className="rounded-sm border border-border-light bg-surface-sunken/35 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="opaque-spec-label">Load</div>
        <div className="font-mono text-[11px] font-medium text-text-primary">
          {stats.cores || '-'} cores
        </div>
      </div>
      <div className="mt-1.5 truncate font-mono text-[10px] text-text-tertiary">
        {stats.load?.slice(0, 3).map(formatLoadValue).join(' / ') || '-'}
      </div>
    </div>
  );
}

function ServerFactChips({ stats }: { stats: ServerStats }) {
  const facts = [
    {
      label: 'Mem',
      value: `${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)}`,
    },
    {
      label: 'Disk',
      value: `${formatBytes(stats.disk.used)} / ${formatBytes(stats.disk.total)}`,
    },
    {
      label: 'In',
      value: formatBandwidth(stats.network.in),
    },
    {
      label: 'Out',
      value: formatBandwidth(stats.network.out),
    },
    {
      label: 'Up',
      value: stats.uptime || '-',
    },
    ...(stats.temperature > 0 ? [{
      label: 'Temp',
      value: `${Math.round(stats.temperature)}C`,
    }] : []),
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {facts.map((fact) => (
        <span
          key={fact.label}
          className="inline-flex min-w-0 items-center gap-1.5 rounded-sm border border-border-light bg-surface-elevated/60 px-2 py-1 text-[11px]"
        >
          <span className="font-condensed text-[9px] font-medium uppercase tracking-[0.14em] text-text-muted">
            {fact.label}
          </span>
          <span className="max-w-[8.5rem] truncate font-mono text-[10px] text-text-secondary">
            {fact.value}
          </span>
        </span>
      ))}
    </div>
  );
}

function ServerTrendPanel({
  samples,
  stats,
}: {
  samples: ServerMetricSample[];
  stats: ServerStats;
}) {
  const cpuValues = samples.length ? samples.map((sample) => sample.cpu) : [stats.cpu];
  const memoryValues = samples.length
    ? samples.map((sample) => percent(sample.memory.used, sample.memory.total))
    : [percent(stats.memory.used, stats.memory.total)];
  const networkValues = samples.length
    ? samples.map((sample) => sample.network.in + sample.network.out)
    : [stats.network.in + stats.network.out];
  const sampleLabel = samples.length
    ? `${samples.length} sample${samples.length === 1 ? '' : 's'}`
    : 'waiting';

  return (
    <div className="mt-4 rounded-sm border border-border-light bg-surface-sunken/25 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="opaque-spec-label">
          24h telemetry
        </div>
        <div className="font-mono text-[10px] text-text-muted">
          {sampleLabel}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <TrendMini label="CPU" valueLabel={`${stats.cpu.toFixed(0)}%`} values={cpuValues} />
        <TrendMini
          label="Memory"
          valueLabel={`${percent(stats.memory.used, stats.memory.total)}%`}
          values={memoryValues}
        />
        <TrendMini
          label="Network"
          valueLabel={formatBandwidth(stats.network.in + stats.network.out)}
          values={networkValues}
        />
      </div>
    </div>
  );
}

function TrendMini({
  label,
  valueLabel,
  values,
}: {
  label: string;
  valueLabel: string;
  values: number[];
}) {
  return (
    <div className="min-w-0 rounded-sm bg-surface-elevated/60 p-1.5">
      <div className="mb-1 flex items-center justify-between gap-1">
        <div className="opaque-spec-label truncate">
          {label}
        </div>
        <div className="truncate font-mono text-[10px] text-text-secondary">
          {valueLabel}
        </div>
      </div>
      <TrendSparkline values={values} />
    </div>
  );
}

function TrendSparkline({ values }: { values: number[] }) {
  const points = sparklinePoints(values);

  if (!points) {
    return <div className="h-7 rounded-sm bg-surface-sunken/45" />;
  }

  return (
    <div className="h-7 overflow-hidden">
      <svg
        viewBox="0 0 72 28"
        preserveAspectRatio="none"
        className="h-full w-full text-ink-500"
        aria-label="Server telemetry trend"
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

function resolveStats(stats?: ServerStats): ServerStats {
  return {
    ...emptyStats,
    ...stats,
    memory: {
      ...emptyStats.memory,
      ...stats?.memory,
    },
    disk: {
      ...emptyStats.disk,
      ...stats?.disk,
    },
    network: {
      ...emptyStats.network,
      ...stats?.network,
    },
  };
}

function isStatsStale(stats: ServerStats) {
  if (!stats.updatedAt) return true;
  const updatedAt = new Date(stats.updatedAt).getTime();
  if (Number.isNaN(updatedAt)) return true;
  return Date.now() - updatedAt > 30 * 1000;
}

function percent(used: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((used / total) * 100)));
}

function formatLoadValue(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '-';
}

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

function formatBandwidth(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

function sparklinePoints(values: number[], width = 72, height = 28) {
  const finiteValues = values.map(Number).filter(Number.isFinite);
  if (finiteValues.length === 0) return '';

  const points = finiteValues.length === 1
    ? [finiteValues[0], finiteValues[0]]
    : finiteValues;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xStep = width / (points.length - 1);

  return points.map((value, index) => {
    const x = index * xStep;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${roundCoordinate(x)},${roundCoordinate(y)}`;
  }).join(' ');
}

function roundCoordinate(value: number) {
  return Math.round(value * 100) / 100;
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

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

function removeProtocol(url: string) {
  return url.replace(/(^\w+:|^)\/\//, '');
}

export default TreeServer;
