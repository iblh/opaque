import React, { useState, useEffect } from 'react'
import { ServerBranch, ServerStats } from '@/lib/types'

interface ServerTree {
  root: string;
  branches: ServerBranch[];
}

interface TrunkServerProps {
  tree: ServerTree;
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
    return status === 'online' ? 'bg-green-500' : 'bg-gray-400'
  }

  const getTemperatureColor = (temp: number): string => {
    if (temp < 50) return 'text-green-600'
    if (temp < 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="relative grid max-w-[90rem] grid-cols-[repeat(auto-fill,minmax(280px,280px))] gap-6 px-8">
      {tree.branches.map((branch, branchIndex) => {
        const stats = serverStats[branch.id]
        if (!stats) return null

        return (
          <div
            key={branch.id}
            className="relative h-full w-full cursor-pointer overflow-hidden rounded-md border border-border-medium bg-surface-elevated p-6 transition-all duration-300 ease-in-out"
            style={{ '--branch-index': branchIndex } as React.CSSProperties}
          >
            {/* Server header - more compact */}
            <div className="mb-4 flex w-full items-center justify-between">
              <div className="flex min-w-0 items-center">
                <div className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm bg-accent-green-subtle">
                  <div dangerouslySetInnerHTML={{ __html: branch.icon.replace(/svg/g, `svg class="h-5 w-5 fill-accent-green"`) }} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="m-0 text-base font-semibold leading-tight text-text-primary">
                    {branch.name}
                  </div>
                  <div className="break-all font-mono text-xs leading-tight text-text-tertiary">
                    {removeProtocol(branch.url)}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <div className={`h-2 w-2 rounded-full ${getStatusColor(stats.status)}`}></div>
                <span className="text-xs text-text-tertiary">
                  {stats.status}
                </span>
              </div>
            </div>

            {/* Compact server stats - always visible */}
            <div className="space-y-3">
              {/* CPU and Memory in one row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wider text-text-tertiary">CPU</div>
                  <div className="font-mono text-sm font-medium text-text-primary">{stats.cpu.toFixed(1)}%</div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        stats.cpu > 80 ? 'bg-red-500' : 
                        stats.cpu > 60 ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}
                      style={{ width: `${stats.cpu}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wider text-text-tertiary">Memory</div>
                  <div className="font-mono text-sm font-medium text-text-primary">
                    {Math.round((stats.memory.used / stats.memory.total) * 100)}%
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
                    <div 
                      className="h-full rounded-full bg-accent-green transition-all duration-300"
                      style={{ 
                        width: `${(stats.memory.used / stats.memory.total) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Network and Storage in one row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wider text-text-tertiary">Network</div>
                  <div className="font-mono text-xs text-text-primary">
                    ↓ {formatBandwidth(stats.network.in)}
                  </div>
                  <div className="font-mono text-xs text-text-primary">
                    ↑ {formatBandwidth(stats.network.out)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wider text-text-tertiary">Storage</div>
                  <div className="font-mono text-sm font-medium text-text-primary">
                    {Math.round((stats.disk.used / stats.disk.total) * 100)}%
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
                    <div 
                      className="h-full rounded-full bg-accent-green transition-all duration-300"
                      style={{ 
                        width: `${(stats.disk.used / stats.disk.total) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Bottom row - Temperature and Uptime */}
              <div className="grid grid-cols-2 gap-3 border-t border-border-light pt-2">
                <div>
                  <div className="text-xs text-text-tertiary">Temperature</div>
                  <div className={`text-sm font-medium ${getTemperatureColor(stats.temperature)}`}>
                    {stats.temperature.toFixed(1)}°C
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Uptime</div>
                  <div className="font-mono text-sm font-medium text-text-primary">
                    {stats.uptime}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TrunkServer 