export interface Leaf {
  id: string;
  name: string;
  url: string;
  icon: string;
}

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

export type Branch = BookmarkBranch | ApplicationBranch | ServerBranch;

export interface Tree {
  root: string;
  branches: Branch[];
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
