import React, { useState, useEffect } from 'react'

interface ServerStats {
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

interface Branch {
  id: string;
  name: string;
  url: string;
  icon: string;
  stats: ServerStats;
}

interface Tree {
  root: string;
  branches: Branch[];
}

interface TrunkServerProps {
  tree: Tree;
}

const generateMockStats = (baseStats: ServerStats): ServerStats => {
  // Simulate CPU fluctuation (±5%)
  const cpuDelta = Math.random() * 10 - 5
  const newCpu = Math.max(0, Math.min(100, baseStats.cpu + cpuDelta))

  // Simulate memory usage fluctuation (±2%)
  const memoryUsedDelta = baseStats.memory.total * (Math.random() * 0.04 - 0.02)
  const newMemoryUsed = Math.max(0, Math.min(baseStats.memory.total, baseStats.memory.used + memoryUsedDelta))

  // Simulate network traffic fluctuation
  const networkInDelta = Math.random() * 1000000 // ±1MB/s
  const networkOutDelta = Math.random() * 1000000 // ±1MB/s

  // Simulate temperature fluctuation (±2°C)
  const tempDelta = Math.random() * 4 - 2
  const newTemp = Math.max(20, Math.min(90, baseStats.temperature + tempDelta))

  return {
    ...baseStats,
    cpu: Number(newCpu.toFixed(1)),
    memory: {
      ...baseStats.memory,
      used: Math.floor(newMemoryUsed)
    },
    network: {
      in: Math.max(0, baseStats.network.in + networkInDelta),
      out: Math.max(0, baseStats.network.out + networkOutDelta)
    },
    temperature: Number(newTemp.toFixed(1))
  }
}

const TrunkServer: React.FC<TrunkServerProps> = ({ tree }) => {
  const [expandedServer, setExpandedServer] = useState<string | null>(null)
  const [serverStats, setServerStats] = useState<Record<string, ServerStats>>({})

  useEffect(() => {
    // Initialize mock stats for each server
    const initialStats: Record<string, ServerStats> = {}
    tree.branches.forEach(branch => {
      initialStats[branch.id] = {
        status: 'online',
        uptime: '5d 12h 30m',
        cpu: 45 + Math.random() * 20,
        memory: {
          used: 8589934592 + Math.random() * 4294967296, // 8-12GB
          total: 17179869184 // 16GB
        },
        disk: {
          used: 107374182400, // 100GB
          total: 214748364800 // 200GB
        },
        network: {
          in: 5000000, // 5MB/s
          out: 2000000 // 2MB/s
        },
        temperature: 45 + Math.random() * 10 // 45-55°C
      }
    })
    setServerStats(initialStats)

    // Update stats every 2 seconds
    const interval = setInterval(() => {
      setServerStats(prevStats => {
        const newStats: Record<string, ServerStats> = {}
        Object.entries(prevStats).forEach(([id, stats]) => {
          newStats[id] = generateMockStats(stats)
        })
        return newStats
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [tree.branches])

  const removeProtocol = (url: string) => {
    return url.replace(/(^\w+:|^)\/\//, '')
  }

  const formatBytes = (bytes: number, decimals = 1): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
  }

  const formatBandwidth = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`
  }

  const getStatusColor = (status: ServerStats['status']): string => {
    return status === 'online' ? 'bg-emerald-400/80' : 'bg-stone-400/60'
  }

  const getTemperatureColor = (temp: number): string => {
    if (temp < 50) return 'text-emerald-500'
    if (temp < 70) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <div className="trunk">
      {tree.branches.map((branch, branchIndex) => {
        const stats = serverStats[branch.id]
        if (!stats) return null

        return (
          <div
            key={branch.id}
            className={`branch b-server ${expandedServer === branch.id ? 'expanded' : ''}`}
            style={{ '--branch-index': branchIndex } as React.CSSProperties}
            onClick={() => setExpandedServer(expandedServer === branch.id ? null : branch.id)}
          >
            {/* Server header */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center min-w-0">
                <div className="branch-icon">
                  <div dangerouslySetInnerHTML={{ __html: branch.icon }} />
                </div>
                <div className="branch-info">
                  <div className="branch-name">
                    {branch.name}
                  </div>
                  <div className="branch-url">
                    {removeProtocol(branch.url)}
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(stats.status)}`}></div>
                  <span className="text-xs uppercase tracking-wider text-stone-600/80">
                    {stats.status}
                  </span>
                </div>
                <div className="text-sm font-mono">
                  <span className="text-stone-600/80">CPU: </span>
                  <span className={`font-medium ${stats.cpu > 80 ? 'text-red-500' : 'text-stone-700'}`}>
                    {stats.cpu}%
                  </span>
                </div>
                <div className="text-sm font-mono">
                  <span className="text-stone-600/80">MEM: </span>
                  <span className="font-medium text-stone-700">
                    {Math.round((stats.memory.used / stats.memory.total) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Expanded server stats */}
            {expandedServer === branch.id && (
              <div className="mt-6 pt-4 border-t border-stone-200/40">
                {/* Main metrics grid */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {/* CPU Usage */}
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wider text-stone-500/70">CPU Usage</div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-stone-700/90">{stats.cpu}%</div>
                      <div className="w-full h-1 bg-stone-100/60 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            stats.cpu > 80 ? 'bg-red-500/80' : 
                            stats.cpu > 60 ? 'bg-amber-500/80' : 
                            'bg-emerald-500/80'
                          }`}
                          style={{ width: `${stats.cpu}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Memory Usage */}
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wider text-stone-500/70">Memory</div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-stone-700/90">
                        {formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)}
                      </div>
                      <div className="w-full h-1 bg-stone-100/60 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-stone-600/80 rounded-full transition-all duration-300"
                          style={{ width: `${(stats.memory.used / stats.memory.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Network Traffic */}
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wider text-stone-500/70">Network</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-stone-500/70">↓ IN</div>
                        <div className="text-sm font-medium text-stone-700/90">
                          {formatBandwidth(stats.network.in)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-stone-500/70">↑ OUT</div>
                        <div className="text-sm font-medium text-stone-700/90">
                          {formatBandwidth(stats.network.out)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Temperature & Uptime */}
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wider text-stone-500/70">System</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-stone-500/70">TEMP</div>
                        <div className={`text-sm font-medium ${getTemperatureColor(stats.temperature)}`}>
                          {stats.temperature}°C
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-stone-500/70">UPTIME</div>
                        <div className="text-sm font-medium text-stone-700/90">
                          {stats.uptime}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Disk Usage */}
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wider text-stone-500/70">Storage</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-stone-700/90">
                        {formatBytes(stats.disk.used)} / {formatBytes(stats.disk.total)}
                      </span>
                      <span className="text-stone-500/70">
                        {Math.round((stats.disk.used / stats.disk.total) * 100)}% used
                      </span>
                    </div>
                    <div className="w-full h-1 bg-stone-100/60 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-stone-600/80 rounded-full transition-all duration-300"
                        style={{ width: `${(stats.disk.used / stats.disk.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default TrunkServer 