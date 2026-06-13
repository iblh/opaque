'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import TreeBookmark from '@/components/Tree/TreeBookmark'
import TreeApplication from '@/components/Tree/TreeApplication'
import TreeServer from '@/components/Tree/TreeServer'
import TreeModule from '@/components/Tree/TreeModule'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import DashboardLayoutEditor from '@/components/DashboardLayoutEditor'
import DashboardOnboarding, { OnboardingDraft } from '@/components/DashboardOnboarding'
import DashboardSkeleton, { saveLayoutSnapshot } from '@/components/DashboardSkeleton'
import { getLayoutRows } from '@/lib/dashboardLayout'
import { cloneDashboard, normalizeDashboard } from '@/lib/dashboard'
import {
  clearCachedDashboard,
  readCachedDashboard,
  saveCachedDashboard,
} from '@/lib/dashboardCache'
import { Branch, Dashboard, ModuleBranch, ServerStats, Tree } from '@/lib/types'
import {
  createDefaultModulesForRoot,
  isKnownModuleType,
  isModuleRoot,
} from '@/lib/modules'
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
  // True only once /api/dashboard/get confirms the current session. The
  // optimistic cached paint is unverified: we render it, but gate editing
  // and saving on this so a stale cached copy can never overwrite newer
  // server data, and a prior user's data can never be edited on a shared
  // browser.
  const [isVerified, setIsVerified] = useState(false)
  const router = useRouter()

  // Mirrors edit state for the background fetch below, so a slow response
  // never clobbers a session the user has already started editing.
  const editingRef = useRef(false)
  useEffect(() => {
    editingRef.current = isEditing || isDirty
  }, [isEditing, isDirty])

  useEffect(() => {
    // Paint the last known dashboard immediately (sanitized, no secrets); the
    // verified fetch below replaces it. The skeleton only appears on a true
    // first visit. `cachedId` lets us detect a cross-session paint and discard
    // it unconditionally once the real owner is known.
    let cachedId: string | null = null
    const cached = readCachedDashboard()
    if (cached) {
      cachedId = cached.id
      const normalized = normalizeDashboard(cached.dashboard)
      setDashboard(normalized)
      setDraftDashboard(cloneDashboard(normalized))
      setLoading(false)
    }

    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard/get', {
          method: 'GET',
        })

        if (res.status === 401) {
          clearCachedDashboard()
          router.push('/login')
          return
        }

        if (res.ok) {
          const data = await res.json()
          const normalized = normalizeDashboard(data.dashboard)
          const sameAsCached = cachedId !== null
            && (normalized.id || normalized._id) === cachedId
          saveCachedDashboard(normalized)
          // Adopt the verified copy unless the user is mid-edit on the SAME
          // dashboard we just refreshed. A different id means the cached paint
          // belonged to another session, so it's always replaced.
          if (!sameAsCached || !editingRef.current) {
            setDashboard(normalized)
            setDraftDashboard(cloneDashboard(normalized))
          }
          setIsVerified(true)
        } else if (cachedId === null) {
          setError('Failed to load dashboard')
        }
      } catch (err) {
        // With a cached paint on screen, a failed refresh stays silent.
        if (cachedId === null) setError('Network error')
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

  // Remember the layout's shape so the next visit's loading skeleton can
  // mirror the user's real structure instead of a generic frame.
  useEffect(() => {
    if (!dashboard) return
    const rows = getLayoutRows(materializeImplicitLayout(dashboard.forest, false))
    saveLayoutSnapshot(rows.map((row) => ({
      roots: row.cells.map((cell) => String(cell.tree.root)),
      widths: row.cells.map((cell) => cell.widthPct),
    })))
  }, [dashboard])

  const layoutForest = useMemo(() => (
    visibleDashboard ? materializeImplicitLayout(visibleDashboard.forest, isEditing) : []
  ), [visibleDashboard, isEditing])

  const startEditing = () => {
    // Editing is only safe once the server copy is confirmed: editing an
    // unverified cached paint risks saving stale data over newer server state.
    if (!dashboard || !isVerified) return
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
    // `isVerified` is the invariant that makes saving safe — never write a
    // draft derived from an unverified cached paint back to the server.
    if (!draftDashboard || !isDirty || !isVerified) return

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
      saveCachedDashboard(normalized)
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
      const hasExistingTree = current.forest.some((item) => item.root === tree.root)

      return {
        ...current,
        forest: hasExistingTree
          ? current.forest.map((item) => (item.root === tree.root ? tree : item))
          : [...current.forest, tree],
      }
    })
    setIsDirty(true)
  }

  const updateForest = (forest: Tree[]) => {
    setDraftDashboard((current) => (
      current ? { ...current, forest } : current
    ))
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
          <div className="relative z-10">
            <DashboardSkeleton />
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
              <div className="mx-auto h-0.5 w-12 bg-accent-red"></div>
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
        canEdit={isVerified}
        saveError={saveError}
        onEdit={startEditing}
        onReset={resetEditing}
        onSave={saveDashboard}
      />
      <div className="relative flex-1 overflow-x-hidden bg-background">
        <div className="relative z-10">
          <div id="dashboard" className="relative flex min-h-full flex-col py-16">
            <div className="mx-4 animate-fade-in md:mx-8">
              <div className="h-0.5 w-6 bg-ink-300"></div>
              <p className="mt-2.5 font-serif text-sm leading-none text-text-secondary">
                {timeGreeting()}{displayName ? `, ${displayName}` : ''}
                <span className="text-text-muted"> — {todayLabel()}</span>
              </p>
            </div>

            {!isEditing && isDashboardEmpty ? (
              <DashboardOnboarding
                displayName={displayName}
                onCreateDraft={createOnboardingDraft}
                onOpenEditor={startEditing}
              />
            ) : (
              <div className="mt-8 animate-fade-in-up">
                <DashboardLayoutEditor
                  forest={layoutForest}
                  isEditing={isEditing}
                  onForestChange={updateForest}
                  renderSection={(tree) => (
                    <RootContent
                      tree={tree}
                      isEditing={isEditing}
                      onTreeChange={updateTree}
                    />
                  )}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function addOnboardingBranch(dashboard: Dashboard, draft: OnboardingDraft): Dashboard {
  const branches = createOnboardingBranches(draft)
  let didInsert = false

  const forest = dashboard.forest.map((tree) => {
    if (tree.root !== draft.kind) return tree

    didInsert = true
    return {
      ...tree,
      branches: [...tree.branches, ...branches],
    }
  })

  if (!didInsert) {
    forest.push({
      root: draft.kind,
      branches,
    })
  }

  return {
    ...dashboard,
    forest,
  }
}

function createOnboardingBranches(draft: OnboardingDraft): Branch[] {
  if (isModuleRoot(draft.kind)) {
    return createDefaultModulesForRoot(draft.kind)
  }

  if (draft.kind === 'servers') {
    return [{
      id: newId(),
      name: draft.itemName,
      url: draft.url,
      icon: DEFAULT_SERVER_ICON,
    }]
  }

  return [{
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
  }]
}

function materializeImplicitLayout(forest: Tree[], isEditing: boolean): Tree[] {
  const renderable = forest.filter((tree) => isEditing || hasRenderableTree(tree))

  const explicitRowIndices = renderable
    .map((tree) => tree.layout?.rowIndex)
    .filter((value): value is number => typeof value === 'number')
  const nextRowIndex = explicitRowIndices.length > 0
    ? Math.max(...explicitRowIndices) + 1
    : 0

  let synthetic = nextRowIndex

  return renderable.map((tree) => {
    if (tree.layout) return tree
    const rowIndex = synthetic++
    return {
      ...tree,
      layout: {
        rowId: `implicit-${tree.root}`,
        rowIndex,
        colIndex: 0,
        widthPct: 100,
      },
    }
  })
}

function RootContent({
  tree,
  isEditing,
  onTreeChange,
}: {
  tree: Tree
  isEditing: boolean
  onTreeChange: (tree: Tree) => void
}) {
  if (tree.root === 'bookmarks') {
    return (
      <TreeBookmark
        tree={tree as any}
        isEditing={isEditing}
        onTreeChange={(nextTree) => onTreeChange(nextTree as Tree)}
      />
    )
  }

  if (tree.root === 'applications') {
    return (
      <TreeApplication
        tree={tree as any}
        isEditing={isEditing}
        onTreeChange={(nextTree) => onTreeChange(nextTree as Tree)}
      />
    )
  }

  if (tree.root === 'servers') {
    return (
      <TreeServer
        tree={tree as any}
        isEditing={isEditing}
        onTreeChange={(nextTree) => onTreeChange(nextTree as Tree)}
      />
    )
  }

  if (isModuleRoot(tree.root)) {
    return (
      <TreeModule
        tree={tree as any}
        isEditing={isEditing}
        onTreeChange={(nextTree) => onTreeChange(nextTree as Tree)}
      />
    )
  }

  return null
}

function hasRenderableTree(tree: Tree) {
  if (tree.branches.length === 0) return false

  if (isModuleRoot(tree.root)) {
    return (tree.branches as ModuleBranch[]).some((branch) => (
      branch.enabled !== false && isKnownModuleType(branch.moduleType)
    ))
  }

  return true
}

function timeGreeting() {
  const hour = new Date().getHours()
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
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
