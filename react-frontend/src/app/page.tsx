'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import TrunkBookmark from '@/components/Trunk/TrunkBookmark'
import TrunkApplication from '@/components/Trunk/TrunkApplication'
import TrunkServer from '@/components/Trunk/TrunkServer'
import Tune from '@/components/Tune'
import { Dashboard, Tree } from '@/lib/types'

const trunkMapping = {
  bookmarks: TrunkBookmark,
  applications: TrunkApplication,
  servers: TrunkServer,
}

export default function HomePage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const jwt_token = Cookies.get('jwt_token')
        if (!jwt_token) {
          router.push('/login')
          return
        }

        const res = await fetch('/api/dashboard/get', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${jwt_token}`,
          },
        })

        if (res.status === 401) {
          // Token invalid, redirect to login
          Cookies.remove('jwt_token')
          router.push('/login')
          return
        }

        if (res.ok) {
          const data = await res.json()
          setDashboard(data.dashboard)
        } else {
          setError('Failed to load dashboard')
        }
      } catch (err) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white">
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="mx-auto h-0.5 w-8 animate-pulse bg-gray-400"></div>
            <div className="animate-fade-in text-sm font-light tracking-wide text-gray-600">
              Loading your workspace...
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white">
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="space-y-6 text-center">
            <div className="mx-auto h-0.5 w-12 bg-red-400"></div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-800">
                Unable to connect
              </div>
              <div className="max-w-xs text-xs text-gray-600">
                {error}
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary text-xs"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white">
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="space-y-6 text-center">
            <div className="mx-auto h-0.5 w-8 bg-gray-400"></div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-800">
                Your canvas awaits
              </div>
              <div className="max-w-xs text-xs leading-relaxed text-gray-600">
                No data found. Your creative space is ready to be filled.
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">

      <div className="relative z-10">
        <div id="dashboard" className="relative flex min-h-screen flex-col py-16">
          {/* Header - Minimalist welcome */}
          <div className="animate-fade-in absolute top-6 left-8 space-y-2">
            <div className="h-0.5 w-6 bg-gray-400"></div>
            <div className="text-xs font-medium uppercase tracking-widest text-gray-600">
              Welcome back, {dashboard.username}
            </div>
          </div>

          {dashboard.forest && dashboard.forest.map((tree, index) => {
            return (
              <div 
                key={index} 
                className="relative my-8 flex animate-fade-in-up flex-row justify-between"
                style={{ '--tree-index': index } as React.CSSProperties}
              >
                <div className="relative flex w-[12.5rem] items-start justify-end py-2 pt-4 text-xs font-medium uppercase tracking-widest text-text-tertiary after:absolute after:right-[-1rem] after:top-1/2 after:h-px after:w-3 after:-translate-y-1/2 after:bg-border-light">{tree.root}</div>
                
                {tree.root === 'bookmarks' && (
                  <TrunkBookmark tree={tree as any} />
                )}
                {tree.root === 'applications' && (
                  <TrunkApplication tree={tree as any} />
                )}
                {tree.root === 'servers' && (
                  <TrunkServer tree={tree as any} />
                )}
                
                <div className="relative w-[12.5rem]" />
              </div>
            )
          })}

          {/* Empty state with mindful messaging */}
          {(!dashboard.forest || dashboard.forest.length === 0) && (
            <div className="flex min-h-[60vh] flex-1 items-center justify-center">
              <div className="animate-fade-in-up space-y-8 text-center">
                <div className="space-y-4">
                  <div className="mx-auto h-0.5 w-16 bg-stone-300/60"></div>
                  <div>
                    <h2 className="mb-2 text-lg font-light tracking-tight text-stone-800/90">
                      Your mindful workspace
                    </h2>
                    <p className="max-w-sm text-xs leading-relaxed text-stone-600/70">
                      A clean canvas awaits. Begin by organizing your bookmarks, applications, 
                      and servers into meaningful collections.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-center space-x-6 text-xs text-stone-500/60">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-stone-300/40"></div>
                    <span>Bookmarks</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-amber-300/40"></div>
                    <span>Applications</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-stone-400/40"></div>
                    <span>Servers</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Tune dashboard={dashboard} setDashboard={setDashboard} />
      </div>
    </div>
  )
}
