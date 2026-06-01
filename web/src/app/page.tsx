'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import TreeBookmark from '@/components/Tree/TreeBookmark'
import TreeApplication from '@/components/Tree/TreeApplication'
import TreeServer from '@/components/Tree/TreeServer'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import DashboardOnboarding, { OnboardingDraft } from '@/components/DashboardOnboarding'
import { cloneDashboard, normalizeDashboard } from '@/lib/dashboard'
import { Dashboard, ServerStats, Tree } from '@/lib/types'
import {
  DEFAULT_APPLICATION_ICON,
  DEFAULT_BOOKMARK_ICON,
  DEFAULT_SERVER_ICON,
} from '@/lib/svg'

const SERVER_STATS_POLL_INTERVAL_MS = 5000

export default function HomePage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [draftDashboard, setDraftDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard/get', {
          method: 'GET',
        })

        if (res.status === 401) {
          router.push('/login')
          return
        }

        if (res.ok) {
          const data = await res.json()
          const normalized = normalizeDashboard(data.dashboard)
          setDashboard(normalized)
          setDraftDashboard(cloneDashboard(normalized))
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

  useEffect(() => {
    if (loading || isEditing) return

    let isCancelled = false

    const fetchServerStats = async () => {
      try {
        const res = await fetch('/api/server/metrics', {
          method: 'GET',
          cache: 'no-store',
        })

        if (res.status === 401) {
          router.push('/login')
          return
        }

        if (!res.ok) return

        const data = await res.json()
        const servers = Array.isArray(data.servers) ? data.servers : []
        const statsByServerId = new Map<string, ServerStats>()

        servers.forEach((server: any) => {
          if (typeof server?.id === 'string' && server.stats) {
            statsByServerId.set(server.id, server.stats)
          }
        })

        if (isCancelled || statsByServerId.size === 0) return

        setDashboard((current) => (
          current ? mergeServerStats(current, statsByServerId) : current
        ))
      } catch (err) {
        // Keep the last known metrics when a polling request fails.
      }
    }

    fetchServerStats()
    const intervalId = window.setInterval(fetchServerStats, SERVER_STATS_POLL_INTERVAL_MS)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [isEditing, loading, router])

  const activeDashboard = isEditing ? draftDashboard : dashboard
  const visibleDashboard = useMemo(() => activeDashboard, [activeDashboard])

  const displayName = activeDashboard?.name || activeDashboard?.username || activeDashboard?.email
  const isDashboardEmpty = visibleDashboard?.forest.every((tree) => tree.branches.length === 0) ?? false

  const startEditing = () => {
    if (!dashboard) return
    setDraftDashboard(cloneDashboard(dashboard))
    setIsEditing(true)
    setIsDirty(false)
    setSaveError('')
  }

  const resetEditing = () => {
    if (dashboard) {
      setDraftDashboard(cloneDashboard(dashboard))
    }
    setIsEditing(false)
    setIsDirty(false)
    setSaveError('')
  }

  const saveDashboard = async () => {
    if (!draftDashboard || !isDirty) return

    setIsSaving(true)
    setSaveError('')

    try {
      const res = await fetch('/api/dashboard/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dashboard: draftDashboard }),
      })

      const result = await res.json()

      if (!res.ok) {
        setSaveError(result.error || 'Failed to save')
        return
      }

      const normalized = normalizeDashboard(result.dashboard)
      setDashboard(normalized)
      setDraftDashboard(cloneDashboard(normalized))
      setIsEditing(false)
      setIsDirty(false)
    } catch (err) {
      setSaveError('Network error')
    } finally {
      setIsSaving(false)
    }
  }

  const updateTree = (tree: Tree) => {
    setDraftDashboard((current) => {
      if (!current) return current

      return {
        ...current,
        forest: current.forest.map((item) => (item.root === tree.root ? tree : item)),
      }
    })
    setIsDirty(true)
  }

  const createOnboardingDraft = (draft: OnboardingDraft) => {
    if (!dashboard) return

    const nextDashboard = addOnboardingBranch(cloneDashboard(dashboard), draft)
    const normalized = normalizeDashboard(nextDashboard)

    setDraftDashboard(cloneDashboard(normalized))
    setIsEditing(true)
    setIsDirty(true)
    setSaveError('')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="relative flex-1 overflow-x-hidden bg-background">
          <div className="relative z-10 flex min-h-full items-center justify-center">
            <div className="space-y-4 text-center">
              <div className="mx-auto h-0.5 w-8 animate-pulse bg-ink-400"></div>
              <div className="animate-fade-in text-sm font-light tracking-wide text-text-tertiary">
                Loading dashboard...
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="relative flex-1 overflow-x-hidden bg-background">
          <div className="relative z-10 flex min-h-full items-center justify-center">
            <div className="space-y-6 text-center">
              <div className="mx-auto h-0.5 w-12 bg-red-400"></div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-text-primary">
                  Unable to connect
                </div>
                <div className="max-w-xs text-xs text-text-tertiary">
                  {error}
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="linear-button-secondary text-xs"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!visibleDashboard) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="relative flex-1 overflow-x-hidden bg-background">
          <div className="relative z-10 flex min-h-full items-center justify-center">
            <div className="space-y-6 text-center">
              <div className="mx-auto h-0.5 w-8 bg-ink-300"></div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-text-primary">
                  Dashboard unavailable
                </div>
                <div className="max-w-xs text-xs leading-relaxed text-text-tertiary">
                  No dashboard data was returned for this account.
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        dashboard={activeDashboard}
        isEditing={isEditing}
        isDirty={isDirty}
        isSaving={isSaving}
        saveError={saveError}
        onEdit={startEditing}
        onReset={resetEditing}
        onSave={saveDashboard}
      />
      <div className="relative flex-1 overflow-x-hidden bg-background">
        <div className="relative z-10">
          <div id="dashboard" className="relative flex min-h-full flex-col py-16">
            <div className="animate-fade-in pl-20">
              <div className="h-0.5 w-6 bg-ink-300"></div>
              <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Welcome{displayName ? `, ${displayName}` : ''}
              </div>
            </div>

            {!isEditing && isDashboardEmpty ? (
              <DashboardOnboarding
                displayName={displayName}
                onCreateDraft={createOnboardingDraft}
                onOpenEditor={startEditing}
              />
            ) : (
              visibleDashboard.forest.map((tree, index) => (
                <div
                  key={tree.root}
                  className="relative my-8 flex animate-fade-in-up flex-col gap-4 md:flex-row md:justify-between md:gap-0"
                  style={{ '--tree-index': index } as React.CSSProperties}
                >
                  <div className="relative flex w-full items-start justify-start px-4 py-2 text-xs font-medium uppercase tracking-wider text-text-tertiary after:hidden md:w-[12.5rem] md:justify-end md:px-0 md:pt-4 md:after:absolute md:after:right-[-1rem] md:after:top-1/2 md:after:block md:after:h-px md:after:w-3 md:after:-translate-y-1/2 md:after:bg-border-light">{tree.root}</div>

                  {tree.root === 'bookmarks' && (
                    <TreeBookmark
                      tree={tree as any}
                      isEditing={isEditing}
                      onTreeChange={(nextTree) => updateTree(nextTree as Tree)}
                    />
                  )}
                  {tree.root === 'applications' && (
                    <TreeApplication
                      tree={tree as any}
                      isEditing={isEditing}
                      onTreeChange={(nextTree) => updateTree(nextTree as Tree)}
                    />
                  )}
                  {tree.root === 'servers' && (
                    <TreeServer
                      tree={tree as any}
                      isEditing={isEditing}
                      onTreeChange={(nextTree) => updateTree(nextTree as Tree)}
                    />
                  )}

                  <div className="relative hidden w-[12.5rem] md:block" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function addOnboardingBranch(dashboard: Dashboard, draft: OnboardingDraft): Dashboard {
  const branch = createOnboardingBranch(draft)
  let didInsert = false

  const forest = dashboard.forest.map((tree) => {
    if (tree.root !== draft.kind) return tree

    didInsert = true
    return {
      ...tree,
      branches: [...tree.branches, branch],
    }
  })

  if (!didInsert) {
    forest.push({
      root: draft.kind,
      branches: [branch],
    })
  }

  return {
    ...dashboard,
    forest,
  }
}

function createOnboardingBranch(draft: OnboardingDraft) {
  if (draft.kind === 'servers') {
    return {
      id: newId(),
      name: draft.itemName,
      url: draft.url,
      icon: DEFAULT_SERVER_ICON,
    }
  }

  return {
    id: newId(),
    name: draft.sectionName,
    leaves: [
      {
        id: newId(),
        name: draft.itemName,
        url: draft.url,
        icon: draft.kind === 'applications' ? DEFAULT_APPLICATION_ICON : DEFAULT_BOOKMARK_ICON,
      },
    ],
  }
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2)
}

function mergeServerStats(
  dashboard: Dashboard,
  statsByServerId: Map<string, ServerStats>,
): Dashboard {
  return {
    ...dashboard,
    forest: dashboard.forest.map((tree) => {
      if (tree.root !== 'servers') return tree

      return {
        ...tree,
        branches: tree.branches.map((branch) => {
          const stats = statsByServerId.get(branch.id)
          return stats ? { ...branch, stats } : branch
        }),
      }
    }),
  }
}
