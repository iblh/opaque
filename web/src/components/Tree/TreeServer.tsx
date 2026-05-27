import React, { useRef, useState } from 'react';
import {
  IconCheck,
  IconCopy,
  IconGripVertical,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { ServerBranch, ServerStats } from '@/lib/types';
import SvgIcon from '@/components/SvgIcon';
import { DEFAULT_SERVER_ICON } from '@/lib/svg';

interface ServerTree {
  root: string;
  branches: ServerBranch[];
}

interface TreeServerProps {
  tree: ServerTree;
  isEditing?: boolean;
  onTreeChange?: (tree: ServerTree) => void;
}

type DropPlacement = 'before' | 'after';

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

const TreeServer: React.FC<TreeServerProps> = ({
  tree,
  isEditing = false,
  onTreeChange,
}) => {
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const draggedServerId = useRef<string | null>(null);
  const serverInputClass =
    'arena-input w-full focus:border-ink-700';
  const monoServerInputClass = `${serverInputClass} font-mono text-[11px]`;

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
    draggedServerId.current = null;
    if (!sourceServerId || sourceServerId === targetServerId) return;

    const sourceIndex = tree.branches.findIndex((server) => server.id === sourceServerId);
    const targetIndex = tree.branches.findIndex((server) => server.id === targetServerId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    updateBranches(reorder(tree.branches, sourceIndex, targetIndex, placement));
  };

  const copyAgentId = async (serverId: string) => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(serverId);
  };

  return (
    <div className="relative flex w-full max-w-[90rem] flex-1 flex-wrap items-start gap-4 px-4 md:px-8">
      {tree.branches.map((server) => {
        const stats = resolveStats(server.stats);
        const memoryPercent = percent(stats.memory.used, stats.memory.total);
        const diskPercent = percent(stats.disk.used, stats.disk.total);
        const isServerEditing = editingServerId === server.id;
        const isStale = isStatsStale(stats);

        return (
          <div
            key={server.id}
            className={`relative w-full max-w-[360px] overflow-hidden rounded-sm border bg-white p-4 transition-colors duration-200 ${
              isServerEditing
                ? 'border-border-strong'
                : 'border-border-light hover:border-border-medium hover:bg-[#fcfcfc]'
            }`}
            onDragOver={(event) => {
              if (isEditing && draggedServerId.current) event.preventDefault();
            }}
            onDrop={(event) => {
              if (!isEditing || !draggedServerId.current) return;
              event.preventDefault();
              moveServer(server.id, getDropPlacement(event, 'both'));
            }}
          >
            {isEditing && isServerEditing ? (
              <div className="space-y-2">
                <input
                  value={server.name}
                  onChange={(event) => updateServer(server.id, (item) => ({
                    ...item,
                    name: event.target.value,
                  }))}
                  placeholder="Name"
                  className={serverInputClass}
                />
                <input
                  value={server.url}
                  onChange={(event) => updateServer(server.id, (item) => ({
                    ...item,
                    url: event.target.value,
                  }))}
                  placeholder="URL"
                  className={monoServerInputClass}
                />
                <input
                  value={server.icon}
                  onChange={(event) => updateServer(server.id, (item) => ({
                    ...item,
                    icon: event.target.value,
                  }))}
                  placeholder="SVG icon"
                  className={monoServerInputClass}
                />
                <div className="rounded-sm border border-border-light bg-[#fcfcfc] px-2 py-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">Agent id</div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-secondary">
                      {server.id}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyAgentId(server.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:bg-white hover:text-text-primary"
                      aria-label="Copy agent id"
                      title="Copy agent id"
                    >
                      <IconCopy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setEditingServerId(null)}
                    className="flex h-6 items-center gap-1 rounded-sm px-2 text-xs text-text-secondary hover:bg-surface-sunken"
                  >
                    <IconCheck className="h-3.5 w-3.5" />
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => removeServer(server.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-red-500"
                    aria-label={`Delete ${server.name}`}
                    title="Delete server"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm border border-border-light bg-white text-text-secondary">
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
                    {isEditing && (
                      <div
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={(event) => {
                          draggedServerId.current = server.id;
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', `server:${server.id}`);
                        }}
                        onDragEnd={() => {
                          draggedServerId.current = null;
                        }}
                        className="flex h-7 w-5 cursor-grab items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text-primary"
                        aria-label={`Move ${server.name}`}
                        title="Move server"
                      >
                        <IconGripVertical className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${stats.status === 'online' && !isStale ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="text-xs text-text-tertiary">
                        {stats.status === 'online' && !isStale ? 'online' : 'stale'}
                      </span>
                    </div>
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

                <div className="grid grid-cols-2 gap-4">
                  <MetricBar label="CPU" valueLabel={`${stats.cpu.toFixed(1)}%`} percent={stats.cpu} />
                  <MetricBar label="Memory" valueLabel={`${memoryPercent}%`} percent={memoryPercent} />
                  <MetricBar label="Storage" valueLabel={`${diskPercent}%`} percent={diskPercent} />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase tracking-wider text-text-tertiary">Cores</div>
                      <div className="font-mono text-xs font-medium text-text-primary">
                        {stats.cores || '-'}
                      </div>
                    </div>
                    <div className="font-mono text-[11px] text-text-tertiary">
                      load {stats.load?.slice(0, 3).join(' / ') || '-'}
                    </div>
                  </div>
                </div>

                <div className="arena-meta-table mt-4">
                  <MetaRow label="Memory" value={`${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)}`} />
                  <MetaRow label="Storage" value={`${formatBytes(stats.disk.used)} / ${formatBytes(stats.disk.total)}`} />
                  <MetaRow label="Network in" value={formatBandwidth(stats.network.in)} />
                  <MetaRow label="Network out" value={formatBandwidth(stats.network.out)} />
                  <MetaRow label="Uptime" value={stats.uptime || '-'} />
                  <MetaRow label="Updated" value={formatLastSeen(stats.updatedAt)} />
                </div>
              </>
            )}
          </div>
        );
      })}

      {isEditing && (
        <button
          type="button"
          onClick={addServer}
          className="flex min-h-[220px] w-full max-w-[360px] items-center justify-center gap-2 rounded-sm border border-dashed border-border-medium bg-white text-xs text-text-tertiary hover:border-ink-600 hover:text-text-primary"
        >
          <IconPlus className="h-3.5 w-3.5" />
          Add server
        </button>
      )}
    </div>
  );
};

function MetricBar({
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-text-tertiary">{label}</div>
        <div className="font-mono text-xs font-medium text-text-primary">{valueLabel}</div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className={`h-full rounded-full transition-all duration-300 ${normalized < 70 ? 'bg-accent-green' : normalized < 90 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="arena-meta-row">
      <div className="arena-meta-label">{label}</div>
      <div className="arena-meta-value">{value}</div>
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
  return Math.round((used / total) * 100);
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

function formatLastSeen(updatedAt?: string | Date) {
  if (!updatedAt) return '-';
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return '-';

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
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
