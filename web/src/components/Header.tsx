'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    IconArrowRight,
    IconCheck,
    IconDeviceFloppy,
    IconLoader2,
    IconLogout,
    IconMessageCircle,
    IconRefresh,
    IconSearch,
    IconServer,
    IconSettings,
    IconX,
} from '@tabler/icons-react';
import { Dashboard, ServerBranch } from '@/lib/types';
import {
    buildSearchUrl,
    DEFAULT_SEARCH_PROVIDER_ID,
    getSearchProvider,
    type SearchProviderId,
} from '@/lib/searchProviders';
import NotificationsMenu from '@/components/NotificationsMenu';
import type { AppNotification } from '@/lib/useNotifications';
import SettingsDialog from '@/components/SettingsDialog';
import { confirmDiscardUnsaved } from '@/lib/unsavedGuard';

interface HeaderProps {
    dashboard?: Dashboard | null;
    isEditing?: boolean;
    isDirty?: boolean;
    isSaving?: boolean;
    /** False while the dashboard is still an unverified cached paint. */
    canEdit?: boolean;
    saveError?: string;
    notifications?: AppNotification[];
    unreadCount?: number;
    onNotificationsOpen?: () => void;
    /** Lift a saved display-name change to the page (greeting/onboarding read it). */
    onProfileNameChange?: (name: string) => void;
    onEdit?: () => void;
    onSave?: () => void;
    onReset?: () => void;
}

export default function Header({
    dashboard,
    isEditing = false,
    isDirty = false,
    isSaving = false,
    canEdit = true,
    saveError = '',
    notifications = [],
    unreadCount = 0,
    onNotificationsOpen,
    onProfileNameChange,
    onEdit,
    onSave,
    onReset,
}: HeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchProviderId, setSearchProviderId] = useState<SearchProviderId>(DEFAULT_SEARCH_PROVIDER_ID);
    // Locally reflect a display-name edit from Settings without waiting for a
    // dashboard refetch.
    const [nameOverride, setNameOverride] = useState<string | null>(null);
    const avatarRef = useRef<HTMLDivElement>(null);
    const avatarButtonRef = useRef<HTMLButtonElement>(null);
    const mobileSearchButtonRef = useRef<HTMLButtonElement>(null);
    const desktopSearchRef = useRef<HTMLInputElement>(null);
    const mobileSearchRef = useRef<HTMLInputElement>(null);
    const displayName = nameOverride || dashboard?.name || dashboard?.username || dashboard?.email || 'User';
    const accountLabel = dashboard?.email || dashboard?.username || 'Local workspace';
    const avatarInitial = displayName.charAt(0).toUpperCase();
    const serverSummary = getServerSummary(dashboard);
    const searchProvider = getSearchProvider(searchProviderId);
    const dashboardDate = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date()).replace(/\//g, '.');

    useEffect(() => {
        const handleSearchRequest = () => {
            if (desktopSearchRef.current?.offsetParent) {
                desktopSearchRef.current.focus();
                desktopSearchRef.current.select();
                return;
            }
            setShowMobileSearch(true);
        };

        window.addEventListener('opaque:search-request', handleSearchRequest);
        return () => window.removeEventListener('opaque:search-request', handleSearchRequest);
    }, []);

    useEffect(() => {
        if (!showMobileSearch) return;

        const frame = window.requestAnimationFrame(() => mobileSearchRef.current?.focus());
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            setShowMobileSearch(false);
            window.requestAnimationFrame(() => mobileSearchButtonRef.current?.focus());
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            window.cancelAnimationFrame(frame);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showMobileSearch]);

    useEffect(() => {
        if (!showAvatarDropdown) return;

        function handleClickOutside(event: MouseEvent) {
            if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
                setShowAvatarDropdown(false);
            }
        }

        // The dropdown is marked data-overlay, so the global shortcut layer
        // stands down while it is open — it must own Escape itself.
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.preventDefault();
                setShowAvatarDropdown(false);
                avatarButtonRef.current?.focus();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showAvatarDropdown]);

    useEffect(() => {
        const savedProvider = localStorage.getItem('opaque_search_provider');
        setSearchProviderId(getSearchProvider(savedProvider).id);
    }, []);

    const handleLogout = async () => {
        // Confirm *before* ending the session: logging out first and asking
        // second would leave the draft unreachable even if the user backs out.
        if (!confirmDiscardUnsaved()) return;
        await fetch('/api/user/logout', { method: 'POST' });
        router.push('/login');
    };

    const updateSearchProvider = (providerId: SearchProviderId) => {
        setSearchProviderId(providerId);
        localStorage.setItem('opaque_search_provider', providerId);
    };

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const query = searchQuery.trim();
        if (!query) return;

        window.location.href = buildSearchUrl(searchProviderId, query);
    };

    return (
        <header className={pathname === '/' ? 'sticky top-0 z-40 bg-background/95 backdrop-blur' : 'flex min-h-14 items-center justify-between border-b border-border-light bg-surface-elevated/95 px-6 py-3'}>
            {pathname === '/login' && (
                <div className="text-sm font-medium tracking-tight text-text-primary">OPAQUE</div>
            )}

            {pathname === '/' && (
                <nav className="proto-masthead mx-auto flex w-full max-w-[var(--shell-width)] flex-wrap items-end justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-8 sm:py-6">
                    {/* The colophon sits under the wordmark in A/C/X but above it in
                        K/M, so the flex order is flipped per layout in CSS. */}
                    <div className="proto-mast-identity flex min-w-0 flex-col gap-1">
                        <div className="proto-wordmark font-serif text-4xl leading-none tracking-tight text-text-primary">
                            OPAQUE
                        </div>
                        <div className="proto-colophon font-mono text-[10px] uppercase tracking-widest text-text-muted">
                            <span className="proto-colophon-vol">Vol. 01</span>
                            <span className="proto-colophon-rule" aria-hidden="true" />
                            <span className="proto-colophon-desc">Personal Archive Instrument</span>
                            <span className="proto-colophon-date">{dashboardDate}</span>
                        </div>
                    </div>

                    <div className="proto-mast-tools flex min-w-0 flex-1 items-end justify-end gap-6 font-mono text-[10px] uppercase tracking-widest">
                        <form onSubmit={handleSearchSubmit} className="proto-mast-search relative hidden border-b border-border-medium pb-1 lg:block">
                            <IconSearch className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                            <input
                                ref={desktopSearchRef}
                                id="search"
                                data-dashboard-search
                                type="text"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder={searchProvider.placeholder.replace('Search ', 'Search index via ')}
                                autoComplete="off"
                                className="peer h-6 w-40 bg-transparent pl-5 text-[10px] text-text-primary outline-none placeholder:text-text-faint"
                            />
                            {/* '/' focuses search (see useKeyboardShortcuts); hint hides once focused. */}
                            <kbd className="pointer-events-none absolute right-0 top-1/2 hidden h-4 w-4 -translate-y-1/2 items-center justify-center border border-border-medium bg-surface-sunken font-mono text-[10px] text-text-tertiary peer-placeholder-shown:flex peer-focus:hidden">
                                /
                            </kbd>
                        </form>

                        <div className="proto-mast-date hidden text-right md:block">
                            <div className="text-text-muted">Date Issued</div>
                            <div className="mt-1 text-text-primary">{dashboardDate}</div>
                        </div>

                        {serverSummary.total > 0 && (
                            <div className="proto-mast-status hidden text-right md:block">
                                <div className="proto-mast-status-label text-text-muted">Sys Status</div>
                                <div className={serverSummary.online === serverSummary.total ? 'mt-1 text-accent-green-dark' : 'mt-1 text-accent-red-dark'}>
                                    {serverSummary.online === serverSummary.total ? 'Nominal' : 'Degraded'}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 tracking-normal">
                        {saveError && (
                            <div className="hidden max-w-48 truncate text-xs text-accent-red-dark md:block">
                                {saveError}
                            </div>
                        )}

                        {!isEditing && (
                            <button
                                ref={mobileSearchButtonRef}
                                type="button"
                                onClick={() => setShowMobileSearch((value) => !value)}
                                className="opaque-toolbar-icon lg:hidden"
                                aria-label="Search"
                                aria-expanded={showMobileSearch}
                                title="Search"
                            >
                                <IconSearch />
                            </button>
                        )}

                        {!isEditing && (
                            <button
                                onClick={onEdit}
                                disabled={!canEdit}
                                className="proto-mast-edit opaque-button font-mono uppercase tracking-widest"
                                aria-label="Edit dashboard"
                                title={canEdit ? 'Edit dashboard' : 'Loading…'}
                            >
                                {/* The bracket framing is prototype A's idiom; other
                                    layouts supply their own affixes in CSS. */}
                                {canEdit ? <span className="proto-mast-edit-label">edit</span> : <IconLoader2 className="animate-spin" />}
                            </button>
                        )}

                        {isEditing && (
                            <div className="opaque-edit-bar">
                                <div className="hidden items-center gap-1.5 px-1.5 font-mono text-[9px] uppercase tracking-widest text-text-tertiary sm:flex">
                                    <span className={isDirty ? 'h-1.5 w-1.5 rounded-full bg-accent-green' : 'h-1.5 w-1.5 rounded-full bg-text-muted'} />
                                    <span>{isDirty ? 'draft open' : 'no changes'}</span>
                                </div>
                                {isDirty ? (
                                    <>
                                        <button
                                            onClick={onReset}
                                            className="opaque-edit-button"
                                        >
                                            <IconRefresh />
                                            discard
                                        </button>
                                        <button
                                            onClick={onSave}
                                            disabled={isSaving}
                                            className="opaque-edit-button-primary"
                                        >
                                            {isSaving ? (
                                                <IconLoader2 className="animate-spin" />
                                            ) : (
                                                <IconDeviceFloppy />
                                            )}
                                            save
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={onReset}
                                        className="opaque-edit-button-primary"
                                    >
                                        <IconCheck />
                                        done
                                    </button>
                                )}
                            </div>
                        )}

                        {serverSummary.total > 0 && (
                            <div
                                className="opaque-toolbar-counter"
                                title="Online servers"
                            >
                                <IconServer />
                                {serverSummary.online}/{serverSummary.total}
                            </div>
                        )}

                        <NotificationsMenu
                            notifications={notifications}
                            unreadCount={unreadCount}
                            onOpen={() => onNotificationsOpen?.()}
                        />

                        <div className="relative" ref={avatarRef}>
                            <button
                                ref={avatarButtonRef}
                                onClick={() => setShowAvatarDropdown((value) => !value)}
                                className="opaque-toolbar-avatar"
                                aria-label="User menu"
                                aria-expanded={showAvatarDropdown}
                            >
                                {avatarInitial}
                            </button>
                            {showAvatarDropdown && (
                                <div className="opaque-menu-popover" data-overlay>
                                    <div className="opaque-menu-panel">
                                        <div className="opaque-menu-summary">
                                            <div className="text-xs font-medium leading-relaxed">
                                                Server dashboard
                                            </div>
                                            {serverSummary.total > 0 ? (
                                                <>
                                                    <div className="mt-2.5 h-0.5 rounded-full bg-background/30">
                                                        <div
                                                            className="h-full rounded-full bg-accent-green"
                                                            style={{
                                                                width: `${(serverSummary.online / serverSummary.total) * 100}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="mt-2.5 font-mono text-xs">
                                                        {serverSummary.online} / {serverSummary.total} servers online
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="mt-2.5 font-mono text-xs text-background/75">
                                                    No servers configured
                                                </div>
                                            )}
                                        </div>

                                        <div className="opaque-menu-profile cursor-default">
                                            <span className="opaque-menu-avatar">
                                                {avatarInitial}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-xs font-semibold text-text-primary">
                                                    {displayName}
                                                </span>
                                                <span className="mt-0.5 block truncate font-mono text-[11px] text-text-tertiary">
                                                    {accountLabel}
                                                </span>
                                            </span>
                                        </div>

                                        <div className="opaque-menu-section">
                                            <MenuItem
                                                icon={<IconSettings />}
                                                label="Settings"
                                                onClick={() => {
                                                    setShowAvatarDropdown(false);
                                                    setShowSettings(true);
                                                }}
                                            />
                                            <MenuItem
                                                icon={<IconMessageCircle />}
                                                label="Send feedback"
                                                onClick={() => {
                                                    window.location.href = 'mailto:feedback@opaque.local?subject=OPAQUE feedback';
                                                }}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="opaque-menu-item"
                                        >
                                            <span className="opaque-menu-item-icon">
                                                <IconLogout />
                                            </span>
                                            Log out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    </div>

                    {showMobileSearch && (
                        <form
                            onSubmit={handleSearchSubmit}
                            className="order-last flex w-full items-center gap-2 border-b border-border-medium pb-2 lg:hidden"
                            data-overlay
                        >
                            <IconSearch className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                            <input
                                ref={mobileSearchRef}
                                id="search-mobile"
                                data-dashboard-search
                                type="search"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder={searchProvider.placeholder}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                                className="h-10 min-w-0 flex-1 bg-transparent font-mono text-sm text-text-primary outline-none placeholder:text-text-faint"
                            />
                            <button
                                type="submit"
                                className="opaque-toolbar-icon"
                                aria-label={`Search with ${searchProvider.label}`}
                                title={`Search with ${searchProvider.label}`}
                            >
                                <IconArrowRight />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowMobileSearch(false);
                                    window.requestAnimationFrame(() => mobileSearchButtonRef.current?.focus());
                                }}
                                className="opaque-toolbar-icon"
                                aria-label="Close search"
                                title="Close search"
                            >
                                <IconX />
                            </button>
                        </form>
                    )}
                </nav>
            )}

            {showSettings && (
                <SettingsDialog
                    displayName={displayName}
                    accountLabel={accountLabel}
                    searchProviderId={searchProviderId}
                    onSearchProviderChange={updateSearchProvider}
                    onNameUpdated={(name) => {
                        setNameOverride(name);
                        onProfileNameChange?.(name);
                    }}
                    onClose={() => setShowSettings(false)}
                    returnFocusRef={avatarButtonRef}
                />
            )}
        </header>
    );
}

function MenuItem({
    icon,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="opaque-menu-item"
        >
            <span className="opaque-menu-item-icon">
                {icon}
            </span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
        </button>
    );
}

function getServerSummary(dashboard?: Dashboard | null) {
    const servers = dashboard?.forest
        .find((tree) => tree.root === 'servers')
        ?.branches as ServerBranch[] | undefined;

    if (!Array.isArray(servers)) {
        return { total: 0, online: 0 };
    }

    return {
        total: servers.length,
        online: servers.filter((server) => {
            const updatedAt = server.stats?.updatedAt
                ? new Date(server.stats.updatedAt).getTime()
                : Number.NaN;

            return server.stats?.status === 'online'
                && Number.isFinite(updatedAt)
                && Date.now() - updatedAt <= 30 * 1000;
        }).length,
    };
}
