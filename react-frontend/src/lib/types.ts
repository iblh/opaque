// Shared types for the dashboard components

export interface Leaf {
  id: string;
  name: string;
  url: string;
  icon: string;
}

export interface ServerStats {
  status: 'online' | 'offline';
  uptime: string;
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
  stats: ServerStats;
}

export type Branch = BookmarkBranch | ApplicationBranch | ServerBranch;

export interface Tree {
  root: string;
  branches: Branch[];
}

export interface Dashboard {
  forest: Tree[];
  username: string;
} 