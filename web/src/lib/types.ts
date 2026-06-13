export interface Leaf {
  id: string;
  name: string;
  url: string;
  icon: string;
}

export type DashboardRoot =
  | 'bookmarks'
  | 'applications'
  | 'servers'
  | 'weather'
  | 'calendar'
  | 'markets'
  | 'media'
  | 'posts'
  | (string & {});

export type LayoutPreset = '100' | '50/50' | '33/33/33' | '20/60/20';

export interface TreeLayout {
  rowId: string;
  rowIndex: number;
  colIndex: number;
  widthPct: number;
}

export type KnownModuleType =
  | 'weather'
  | 'calendar'
  | 'markets'
  | 'plex'
  | 'jellyfin'
  | 'emby'
  | 'radarr'
  | 'sonarr'
  | 'rss'
  | 'reddit'
  | 'hacker-news';

export type ModuleType = KnownModuleType | (string & {});

export interface ServerStats {
  status: 'online' | 'offline';
  uptime: string;
  cores?: number;
  load?: number[];
  cpu: number;
  memory: {
    used: number;
    total: number;
  };
  disk: {
    used: number;
    total: number;
  };
  network: {
    in: number;
    out: number;
  };
  temperature: number;
  updatedAt?: string | Date;
}

export interface ServerMetricSample extends ServerStats {
  recordedAt: string;
}

export interface ServerMetricHistory {
  samples: ServerMetricSample[];
}

export interface BaseBranch {
  id: string;
  name: string;
  icon?: string;
}

export interface BookmarkBranch extends BaseBranch {
  leaves: Leaf[];
}

export interface ApplicationBranch extends BaseBranch {
  leaves: Leaf[];
}

export interface ServerBranch extends BaseBranch {
  url: string;
  icon: string;
  stats?: ServerStats;
}

export interface ModuleBranch extends BaseBranch {
  moduleType: ModuleType;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export type Branch = BookmarkBranch | ApplicationBranch | ServerBranch | ModuleBranch;

export interface Tree {
  root: DashboardRoot;
  branches: Branch[];
  layout?: TreeLayout;
}

export interface Dashboard {
  id?: string;
  _id?: string;
  forest: Tree[];
  email?: string;
  username?: string;
  name?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface DashboardIdentity {
  email?: string;
  username?: string;
  name?: string;
} 
