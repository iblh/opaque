'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import TreeBookmark from '@/components/Tree/TreeBookmark'
import TreeApplication from '@/components/Tree/TreeApplication'
import TreeServer from '@/components/Tree/TreeServer'
import TreeModule from '@/components/Tree/TreeModule'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import PresetLayout from '@/components/PresetLayout'
import { reorderWithinRegion } from '@/lib/layouts'
import { setUnsavedWork } from '@/lib/unsavedGuard'
import DashboardOnboarding, { OnboardingDraft } from '@/components/DashboardOnboarding'
import ShortcutsOverlay from '@/components/ShortcutsOverlay'
import { useKeyboardShortcuts, type KeyboardShortcut } from '@/lib/useKeyboardShortcuts'
import { useNotifications } from '@/lib/useNotifications'
import { isOverlayOpen } from '@/lib/overlay'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import {
  buildSkeletonForest,
  readSnapshotRows,
  saveLayoutSnapshot,
  SectionBodySkeleton,
} from '@/components/DashboardSkeleton'
import { getLayoutRows } from '@/lib/dashboardLayout'
import { readAppearance, type AppearancePreference } from '@/lib/theme'
import { DEFAULT_APPEARANCE } from '@/lib/theme'
import { cloneDashboard, normalizeDashboard } from '@/lib/dashboard'
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
  // True only once /api/dashboard/get confirms the current session. Dashboard
  // *content* is never painted before this — only the structure-matched
  // skeleton (from a non-sensitive layout snapshot) shows while we wait — so a
  // prior user's bookmarks/apps/servers can't leak on a shared browser, and
  // there is no unverified copy that could be edited and saved over newer
  // server state.
  const [isVerified, setIsVerified] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  // Which preset skeleton to render. Starts at the default so SSR and the first
  // client render agree, then reconciles to the stored preference before paint.
  const [appearance, setAppearance] = useState<AppearancePreference>(DEFAULT_APPEARANCE)
  const router = useRouter()

  useIsomorphicLayoutEffect(() => {
    setAppearance(readAppearance())
    // Settings writes the preference then announces it, so the dashboard can
    // re-render into the new skeleton without a reload.
    const onChange = () => setAppearance(readAppearance())
    window.addEventListener('opaque:appearance-change', onChange)
    return () => window.removeEventListener('opaque:appearance-change', onChange)
  }, [])

  // System notifications derived from live server status (online↔offline). Fed
  // the verified, stats-merged dashboard so events reflect real transitions.
  const { notifications, unreadCount, markAllRead } = useNotifications(dashboard)

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
          setIsVerified(true)
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

  // Structural-only forest used to paint the real layout while the verified
  // dashboard is still loading. Keep this null through SSR and the first client
  // render: otherwise the server can paint DEFAULT_ROWS before hydration has a
  // chance to read localStorage, causing the visible default→snapshot jump.
  const [skeletonForest, setSkeletonForest] = useState<Tree[] | null>(null)

  useIsomorphicLayoutEffect(() => {
    const rows = readSnapshotRows()
    setSkeletonForest(rows ? buildSkeletonForest(rows) : buildSkeletonForest())
  }, [])

  // Until the real dashboard arrives, lay out the skeleton forest in the very
  // same DashboardLayoutEditor so there is no component swap (hence no jitter)
  // when content fills in.
  const showSkeleton = !visibleDashboard
  const skeletonLayoutReady = !showSkeleton || skeletonForest !== null
  const layoutForest = useMemo(() => (
    visibleDashboard
      ? materializeImplicitLayout(visibleDashboard.forest, isEditing)
      : skeletonForest ?? []
  ), [visibleDashboard, isEditing, skeletonForest])

  // The draft lives only in memory until it is saved, so leaving mid-edit drops
  // it. Two exits need covering and they need different mechanisms:
  //   - leaving the document (tab close, reload) → beforeunload
  //   - navigating inside the SPA (log out, search) → the shared guard, since a
  //     router.push never fires beforeunload
  // Both are armed only while there is genuinely something to lose.
  useEffect(() => {
    const dirty = isEditing && isDirty
    setUnsavedWork(dirty ? 'You have unsaved changes. Leave and discard them?' : null)
    if (!dirty) return

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
      // The page owns this flag; drop it if the editor unmounts mid-edit so a
      // stale reason can never block navigation on some later screen.
      setUnsavedWork(null)
    }
  }, [isEditing, isDirty])

  const startEditing = useCallback(() => {
    // Editing is only safe once the server copy is confirmed: editing an
    // unverified cached paint risks saving stale data over newer server state.
    if (!dashboard || !isVerified) return
    setDraftDashboard(cloneDashboard(dashboard))
    setIsEditing(true)
    setIsDirty(false)
    setSaveError('')
  }, [dashboard, isVerified])

  const resetEditing = useCallback(() => {
    // Discarding is the one destructive action in the editor, so unsaved work is
    // confirmed before it goes. An untouched draft leaves without ceremony.
    if (isDirty && !window.confirm('Discard your unsaved changes?')) return
    if (dashboard) {
      setDraftDashboard(cloneDashboard(dashboard))
    }
    setIsEditing(false)
    setIsDirty(false)
    setSaveError('')
  }, [dashboard, isDirty])

  const saveDashboard = useCallback(async () => {
    // `isVerified` is the invariant that makes saving safe — never write a
    // draft derived from an unverified cached paint back to the server.
    // `isSaving` gate matches the Save button: the Cmd/Ctrl+S shortcut must not
    // fire a second PUT while one is in flight (a stale response could land last
    // and reset the dashboard).
    if (!draftDashboard || !isDirty || !isVerified || isSaving) return

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

      // A proxy or crash can answer with HTML instead of JSON; parsing that
      // would throw and get reported as a network error, hiding the real status.
      const result = await res.json().catch(() => ({} as { error?: string; dashboard?: unknown }))

      if (!res.ok) {
        setSaveError(result.error || describeSaveFailure(res.status))
        return
      }

      const normalized = normalizeDashboard(result.dashboard)
      setDashboard(normalized)
      setDraftDashboard(cloneDashboard(normalized))
      setIsEditing(false)
      setIsDirty(false)
    } catch {
      setSaveError('Couldn’t reach the server — your changes are still here. Try saving again.')
    } finally {
      setIsSaving(false)
    }
  }, [draftDashboard, isDirty, isVerified, isSaving])

  // A display-name change saved from Settings must reach the page's own state,
  // not just the header — the greeting and onboarding read dashboard.name.
  const handleProfileNameChange = useCallback((name: string) => {
    setDashboard((current) => (current ? { ...current, name } : current))
    setDraftDashboard((current) => (current ? { ...current, name } : current))
  }, [])

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

  // Reordering is confined to a single column: the layout owns which column a
  // module lives in, so this only shifts it among its own column's neighbours.
  const moveSection = (root: string, direction: -1 | 1) => {
    setDraftDashboard((current) => {
      if (!current) return current
      return {
        ...current,
        forest: reorderWithinRegion(appearance.layout, current.forest, root, direction),
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

  const focusSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent('opaque:search-request'))
  }, [])

  // Core keyboard layer. Handlers stay silent while typing in a field (the hook
  // gates that), so '/', 'e', '?' don't disrupt text entry. The whole layer also
  // stands down while an overlay (Settings, notifications, the shortcuts sheet,
  // a menu, a drag) is open — those own the keyboard and close themselves, so
  // e.g. ⌘S in the Settings name field won't save the dashboard behind it.
  const shortcuts = useMemo<KeyboardShortcut[]>(() => [
    { key: '/', handler: focusSearch },
    { key: 'e', handler: () => { if (!isEditing) startEditing() } },
    { key: 's', meta: true, allowInInput: true, handler: () => { if (isEditing) void saveDashboard() } },
    { key: 'Escape', handler: () => { if (isEditing) resetEditing() } },
    { key: '?', handler: () => setShowShortcuts(true) },
  ], [focusSearch, isEditing, startEditing, saveDashboard, resetEditing])

  useKeyboardShortcuts(shortcuts, !loading && !error, isOverlayOpen)

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

  // Only a finished load with no dashboard is a genuine error; while loading,
  // fall through to the skeleton layout below.
  if (!visibleDashboard && !loading) {
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
        notifications={notifications}
        unreadCount={unreadCount}
        onNotificationsOpen={markAllRead}
        onProfileNameChange={handleProfileNameChange}
        onEdit={startEditing}
        onReset={resetEditing}
        onSave={saveDashboard}
      />
      <div className="relative flex-1 overflow-x-hidden bg-[var(--page-bg)]">
        <div className="relative z-10">
          {/* The sheet layout draws a continuous page: its masthead and content
              share vertical rules, so the shell adds no top padding there and
              lets the two meet. Other layouts keep their own breathing room. */}
          <div id="dashboard" className="proto-shell relative flex min-h-full w-full flex-col px-[calc(var(--unit)*6)] py-[calc(var(--unit)*8)] pb-[calc(var(--unit)*24)]">
            {!isEditing && isDashboardEmpty ? (
              <DashboardOnboarding
                displayName={displayName}
                onCreateDraft={createOnboardingDraft}
                onOpenEditor={startEditing}
              />
            ) : (
              <div className="mt-[calc(var(--unit)*8)] animate-fade-in-up">
                {skeletonLayoutReady ? (
                  <PresetLayout
                    layout={appearance.layout}
                    forest={layoutForest}
                    isEditing={isEditing}
                    onMove={moveSection}
                    renderSection={(tree) => (
                      showSkeleton
                        ? <SectionBodySkeleton root={tree.root} />
                        : (
                          <RootContent
                            tree={tree}
                            isEditing={isEditing}
                            onTreeChange={updateTree}
                          />
                        )
                    )}
                  />
                ) : (
                  <div className="min-h-[18rem]" aria-hidden="true" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
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

/**
 * Say what the user can do about a failed save. The draft is never dropped on
 * failure, so every message here can safely imply the work is still in hand.
 */
function describeSaveFailure(status: number): string {
  if (status === 401 || status === 403) {
    return 'Your session expired. Sign in again in another tab, then save.'
  }
  if (status === 413) {
    return 'This dashboard is too large to save. Try removing a few items.'
  }
  if (status === 409) {
    return 'This dashboard changed in another tab. Your draft is still here; reload before saving again.'
  }
  if (status >= 500) {
    return 'The server couldn’t save that. Check its logs, then try again.'
  }
  return 'That didn’t save. Your changes are still here.'
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
