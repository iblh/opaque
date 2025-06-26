'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import TrunkBookmark from '@/components/Trunk/TrunkBookmark'
import TrunkApplication from '@/components/Trunk/TrunkApplication'
import TrunkServer from '@/components/Trunk/TrunkServer'
import Tune from '@/components/Tune'
import '@/app/dashboard.css'

interface Leaf {
  id: string;
  name: string;
  url: string;
  icon: string;
}

interface Branch {
  id: string;
  name: string;
  leaves?: Leaf[];
  url?: string;
  icon?: string;
}

interface Tree {
  root: string;
  branches: Branch[];
}

interface Dashboard {
  forest: Tree[];
  username: string;
}

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
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-100/20 via-transparent to-stone-200/10"></div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="w-8 h-0.5 bg-stone-400/70 mx-auto animate-pulse"></div>
            <div className="text-sm text-stone-600/80 font-light tracking-wide animate-fade-in">
              Loading your workspace...
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-100/20 via-transparent to-stone-200/10"></div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-6">
            <div className="w-12 h-0.5 bg-red-400/60 mx-auto"></div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-stone-800/90">
                Unable to connect
              </div>
              <div className="text-xs text-stone-600/70 max-w-xs">
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
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-100/20 via-transparent to-stone-200/10"></div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-6">
            <div className="w-8 h-0.5 bg-amber-400/60 mx-auto"></div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-stone-800/90">
                Your canvas awaits
              </div>
              <div className="text-xs text-stone-600/70 max-w-xs leading-relaxed">
                No data found. Your creative space is ready to be filled.
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 relative overflow-hidden">
      {/* Wabi-Sabi backdrop elements */}
      <div className="absolute inset-0 bg-gradient-to-tr from-amber-100/20 via-transparent to-stone-200/10"></div>
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-amber-200/5 blur-3xl rounded-full"></div>
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-stone-300/8 blur-2xl rounded-full"></div>

      {/* Brutalist geometric accents */}
      <div className="dashboard-accent-top"></div>
      <div className="dashboard-accent-bottom"></div>

      <div className="relative z-10">
        <div id="dashboard">
          {/* Header - Minimalist welcome */}
          <div className="absolute top-6 left-8 space-y-2 animate-fade-in">
            <div className="w-6 h-0.5 bg-stone-400/60"></div>
            <div className="text-xs uppercase tracking-widest text-stone-600/80 font-medium">
              Welcome back, {dashboard.username}
            </div>
          </div>

          {dashboard.forest && dashboard.forest.map((tree, index) => {
            const TrunkComponent = trunkMapping[tree.root as keyof typeof trunkMapping]
            
            return (
              <div 
                key={index} 
                className="tree"
                style={{ '--tree-index': index } as React.CSSProperties}
              >
                <div className="root">{tree.root}</div>
                
                {TrunkComponent && <TrunkComponent tree={tree} />}
                
                <div className="placeholder" />
              </div>
            )
          })}

          {/* Empty state with mindful messaging */}
          {(!dashboard.forest || dashboard.forest.length === 0) && (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-8 animate-fade-in-up">
                <div className="space-y-4">
                  <div className="w-16 h-0.5 bg-stone-300/60 mx-auto"></div>
                  <div>
                    <h2 className="text-lg font-light text-stone-800/90 mb-2 tracking-tight">
                      Your mindful workspace
                    </h2>
                    <p className="text-xs text-stone-600/70 leading-relaxed max-w-sm">
                      A clean canvas awaits. Begin by organizing your bookmarks, applications, 
                      and servers into meaningful collections.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-center space-x-6 text-xs text-stone-500/60">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-stone-300/40 rounded-full"></div>
                    <span>Bookmarks</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-amber-300/40 rounded-full"></div>
                    <span>Applications</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-stone-400/40 rounded-full"></div>
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
