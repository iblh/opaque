'use client'

import { useMemo, useState } from 'react'
import {
  IconApps,
  IconArrowRight,
  IconBookmark,
  IconCalendarEvent,
  IconCheck,
  IconDeviceTv,
  IconNews,
  IconServer,
} from '@tabler/icons-react'

export type OnboardingKind =
  | 'bookmarks'
  | 'applications'
  | 'servers'
  | 'weather'
  | 'media'
  | 'posts'

export interface OnboardingDraft {
  kind: OnboardingKind
  sectionName: string
  itemName: string
  url: string
}

interface DashboardOnboardingProps {
  displayName?: string
  onCreateDraft: (draft: OnboardingDraft) => void
  onOpenEditor: () => void
}

const choices = [
  {
    kind: 'bookmarks' as const,
    label: 'Bookmarks',
    title: 'Save a first reference',
    detail: 'A group with one link.',
    icon: IconBookmark,
  },
  {
    kind: 'applications' as const,
    label: 'Applications',
    title: 'Pin a first tool',
    detail: 'A shelf with one app.',
    icon: IconApps,
  },
  {
    kind: 'servers' as const,
    label: 'Servers',
    title: 'Add a first machine',
    detail: 'A server card ready for metrics.',
    icon: IconServer,
  },
  {
    kind: 'weather' as const,
    label: 'Weather',
    title: 'Add daily context',
    detail: 'Weather now; add calendar & markets in the editor.',
    icon: IconCalendarEvent,
  },
  {
    kind: 'media' as const,
    label: 'Media',
    title: 'Add media status',
    detail: 'Plex, Jellyfin, Radarr, Sonarr.',
    icon: IconDeviceTv,
  },
  {
    kind: 'posts' as const,
    label: 'Posts',
    title: 'Add reading feeds',
    detail: 'RSS, Reddit, and Hacker News.',
    icon: IconNews,
  },
]

const defaults: Record<OnboardingKind, Omit<OnboardingDraft, 'kind'>> = {
  bookmarks: {
    sectionName: 'References',
    itemName: 'First bookmark',
    url: 'https://',
  },
  applications: {
    sectionName: 'Applications',
    itemName: 'First application',
    url: 'https://',
  },
  servers: {
    sectionName: 'Servers',
    itemName: 'First server',
    url: 'https://',
  },
  weather: {
    sectionName: 'Weather',
    itemName: 'Weather module',
    url: '',
  },
  media: {
    sectionName: 'Media',
    itemName: 'Media modules',
    url: '',
  },
  posts: {
    sectionName: 'Posts',
    itemName: 'Post sources',
    url: '',
  },
}

export default function DashboardOnboarding({
  displayName,
  onCreateDraft,
  onOpenEditor,
}: DashboardOnboardingProps) {
  const [kind, setKind] = useState<OnboardingKind>('bookmarks')
  const [sectionName, setSectionName] = useState(defaults.bookmarks.sectionName)
  const [itemName, setItemName] = useState(defaults.bookmarks.itemName)
  const [url, setUrl] = useState(defaults.bookmarks.url)

  const activeChoice = choices.find((choice) => choice.kind === kind) || choices[0]
  const ActiveIcon = activeChoice.icon
  const isServer = kind === 'servers'
  const isModuleRoot = kind === 'weather' || kind === 'media' || kind === 'posts'
  const canCreate = isModuleRoot
    || (itemName.trim().length > 0 && (isServer || sectionName.trim().length > 0))

  const previewHost = useMemo(() => formatPreviewUrl(url), [url])

  const selectKind = (nextKind: OnboardingKind) => {
    setKind(nextKind)
    setSectionName(defaults[nextKind].sectionName)
    setItemName(defaults[nextKind].itemName)
    setUrl(defaults[nextKind].url)
  }

  const createDraft = () => {
    if (!canCreate) return

    onCreateDraft({
      kind,
      sectionName: sectionName.trim() || defaults[kind].sectionName,
      itemName: itemName.trim(),
      url: url.trim(),
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-[64rem] flex-col gap-8 px-4 py-12 md:px-8">
      <div className="grid gap-8 border-t border-border-light pt-8 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
        <div className="min-w-0">
          <div className="mb-6 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            <span className="flex h-5 w-5 items-center justify-center border border-border-light bg-white font-mono text-[10px] text-text-secondary">
              01
            </span>
            First setup
          </div>

          <div className="max-w-xl">
            <h2 className="text-xl font-medium tracking-tight text-text-primary">
              Start with one useful surface
            </h2>
            <p className="mt-3 max-w-md text-xs leading-relaxed text-text-tertiary">
              Choose what should appear first. OPAQUE will create an editable draft before anything is saved.
            </p>
            {displayName && (
              <div className="mt-4 font-mono text-[11px] text-text-muted">
                {displayName}
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {choices.map((choice) => {
              const Icon = choice.icon
              const isActive = kind === choice.kind

              return (
                <button
                  key={choice.kind}
                  type="button"
                  onClick={() => selectKind(choice.kind)}
                  className={`group flex min-h-[7rem] flex-col justify-between border p-3 text-left transition-colors duration-200 ${
                    isActive
                      ? 'border-text-primary bg-white text-text-primary'
                      : 'border-border-light bg-transparent text-text-secondary hover:border-border-medium hover:bg-white'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <Icon className="h-4 w-4" />
                    {isActive && <IconCheck className="h-3.5 w-3.5" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{choice.label}</span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-text-tertiary">
                      {choice.detail}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-8 border-t border-border-light pt-6">
            <div className="grid gap-3 md:grid-cols-2">
              {!isServer && !isModuleRoot && (
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                    {kind === 'bookmarks' ? 'Group' : 'Shelf'}
                  </span>
                  <input
                    value={sectionName}
                    onChange={(event) => setSectionName(event.target.value)}
                    className="opaque-input w-full"
                    placeholder={kind === 'bookmarks' ? 'References' : 'Applications'}
                  />
                </label>
              )}

              {!isModuleRoot ? (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                      {isServer ? 'Server name' : 'Item name'}
                    </span>
                    <input
                      value={itemName}
                      onChange={(event) => setItemName(event.target.value)}
                      className="opaque-input w-full"
                      placeholder={isServer ? 'Home server' : 'Name'}
                    />
                  </label>

                  <label className={`block ${isServer ? '' : 'md:col-span-2'}`}>
                    <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                      URL
                    </span>
                    <input
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      className="opaque-input w-full font-mono text-[11px]"
                      placeholder="https://"
                    />
                  </label>
                </>
              ) : (
                <div className="md:col-span-2 border border-border-light bg-white p-3 text-xs leading-relaxed text-text-tertiary">
                  This creates the default live-data modules for {activeChoice.label}. You can
                  configure, rename, disable, or remove modules in the editor before saving.
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={createDraft}
                disabled={!canCreate}
                className="opaque-button-primary"
              >
                Create draft
                <IconArrowRight />
              </button>
              <button
                type="button"
                onClick={onOpenEditor}
                className="opaque-button"
              >
                Open empty editor
              </button>
            </div>
          </div>
        </div>

        <div className="border-l border-border-light pl-6">
          <div className="mb-6 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            <span className="flex h-5 w-5 items-center justify-center border border-border-light bg-white font-mono text-[10px] text-text-secondary">
              02
            </span>
            Preview
          </div>

          <div className="border border-border-light bg-white p-4">
            <div className="flex items-center gap-2">
              <ActiveIcon className="h-4 w-4 text-text-secondary" />
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                  {activeChoice.label}
                </div>
                <div className="mt-1 h-px w-20 bg-border-light" />
              </div>
            </div>

            <div className="mt-7">
              {kind === 'bookmarks' && (
                <PreviewBookmark
                  sectionName={sectionName}
                  itemName={itemName}
                  url={previewHost}
                />
              )}
              {kind === 'applications' && (
                <PreviewApplication
                  sectionName={sectionName}
                  itemName={itemName}
                  url={previewHost}
                />
              )}
              {kind === 'servers' && (
                <PreviewServer
                  itemName={itemName}
                  url={previewHost}
                />
              )}
              {isModuleRoot && (
                <PreviewModules kind={kind} />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PreviewBookmark({
  sectionName,
  itemName,
  url,
}: {
  sectionName: string
  itemName: string
  url: string
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-sm font-medium text-text-primary">
          {sectionName || 'References'}
        </div>
        <div className="h-px flex-1 bg-border-light" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-text-primary">
          <IconBookmark className="h-4 w-4 text-text-secondary" />
          <span className="border-b border-accent-green">{itemName || 'First bookmark'}</span>
        </div>
        <div className="pl-[22px] font-mono text-[11px] text-text-tertiary">
          {url}
        </div>
      </div>
    </div>
  )
}

function PreviewApplication({
  sectionName,
  itemName,
  url,
}: {
  sectionName: string
  itemName: string
  url: string
}) {
  return (
    <div className="space-y-4">
      <div className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
        {sectionName || 'Applications'}
      </div>
      <div className="flex min-h-[64px] items-center gap-2.5">
        <IconApps className="h-10 w-10 text-accent-blue" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-text-primary">
            {itemName || 'First application'}
          </div>
          <div className="mt-1 truncate font-mono text-xs text-text-tertiary">
            {url}
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewServer({
  itemName,
  url,
}: {
  itemName: string
  url: string
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-text-primary">
            {itemName || 'First server'}
          </div>
          <div className="mt-1 font-mono text-[11px] text-text-tertiary">
            {url}
          </div>
        </div>
        <span className="h-2 w-2 rounded-full bg-text-muted" />
      </div>
      <div className="space-y-3 pt-2">
        <PreviewMeter label="CPU" value="42%" width="42%" />
        <PreviewMeter label="Memory" value="6.8 / 16 GB" width="58%" />
        <PreviewMeter label="Storage" value="312 / 980 GB" width="32%" />
      </div>
    </div>
  )
}

function PreviewModules({ kind }: { kind: 'weather' | 'media' | 'posts' }) {
  const modules = {
    weather: [
      ['Weather', '67 deg, partly cloudy'],
    ],
    media: [
      ['Plex', 'online, 9 libraries'],
      ['Jellyfin', 'online, 7 libraries'],
      ['Radarr', '482 monitored'],
      ['Sonarr', '92 series'],
    ],
    posts: [
      ['RSS', '5 latest posts'],
      ['Hacker News', 'top stories'],
      ['Reddit', 'r/selfhosted'],
    ],
  }[kind]

  return (
    <div className="space-y-3">
      {modules.map(([name, detail]) => (
        <div key={name} className="flex items-baseline justify-between gap-4 border-b border-border-light pb-2 last:border-b-0 last:pb-0">
          <div className="text-xs font-medium text-text-primary">{name}</div>
          <div className="truncate font-mono text-[10px] text-text-tertiary">{detail}</div>
        </div>
      ))}
    </div>
  )
}

function PreviewMeter({
  label,
  value,
  width,
}: {
  label: string
  value: string
  width: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-text-tertiary">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1 bg-surface-sunken">
        <div className="h-full bg-ink-500" style={{ width }} />
      </div>
    </div>
  )
}

function formatPreviewUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed || trimmed === 'https://') return 'https://'

  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    return new URL(withProtocol).host.replace(/^www\./i, '')
  } catch {
    return trimmed
      .replace(/(^\w+:|^)\/\//, '')
      .split(/[/?#]/)[0]
      .replace(/^www\./i, '')
  }
}
