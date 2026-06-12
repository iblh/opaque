'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    IconCheck,
    IconChevronRight,
    IconDeviceFloppy,
    IconEdit,
    IconInfoCircle,
    IconLayoutDashboard,
    IconLoader2,
    IconLogout,
    IconMessageCircle,
    IconPalette,
    IconRefresh,
    IconSearch,
    IconServer,
    IconSettings,
    IconUser,
} from '@tabler/icons-react';
import { Dashboard, ServerBranch } from '@/lib/types';
import { clearCachedDashboard } from '@/lib/dashboardCache';
import {
    buildSearchUrl,
    DEFAULT_SEARCH_PROVIDER_ID,
    getSearchProvider,
    SEARCH_PROVIDERS,
    type SearchProviderId,
} from '@/lib/searchProviders';

interface HeaderProps {
    dashboard?: Dashboard | null;
    isEditing?: boolean;
    isDirty?: boolean;
    isSaving?: boolean;
    saveError?: string;
    onEdit?: () => void;
    onSave?: () => void;
    onReset?: () => void;
}

export default function Header({
    dashboard,
    isEditing = false,
    isDirty = false,
    isSaving = false,
    saveError = '',
    onEdit,
    onSave,
    onReset,
}: HeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchProviderId, setSearchProviderId] = useState<SearchProviderId>(DEFAULT_SEARCH_PROVIDER_ID);
    const avatarRef = useRef<HTMLDivElement>(null);
    const displayName = dashboard?.name || dashboard?.username || dashboard?.email || 'User';
    const accountLabel = dashboard?.email || dashboard?.username || 'Local workspace';
    const avatarInitial = displayName.charAt(0).toUpperCase();
    const serverSummary = getServerSummary(dashboard);
    const searchProvider = getSearchProvider(searchProviderId);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
                setShowAvatarDropdown(false);
            }
        }

        if (showAvatarDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAvatarDropdown]);

    useEffect(() => {
        const savedProvider = localStorage.getItem('opaque_search_provider');
        setSearchProviderId(getSearchProvider(savedProvider).id);
    }, []);

    const handleLogout = async () => {
        clearCachedDashboard();
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
        <header className="flex min-h-14 items-center justify-between border-b border-border-light bg-white/95 px-6 py-3">
            {pathname === '/login' && (
                <div className="text-sm font-medium tracking-tight text-text-primary">OPAQUE</div>
            )}

            {pathname === '/' && (
                <nav className="flex w-full items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="text-sm font-medium tracking-tight text-text-primary">
                            OPAQUE
                        </div>
                        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
                            <input
                                id="search"
                                type="text"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder={searchProvider.placeholder}
                                autoComplete="off"
                                className="peer opaque-input w-[min(22rem,34vw)] pr-8"
                            />
                            <IconSearch className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
                        </form>
                    </div>

                    <div className="flex items-center gap-2">
                        {isEditing && (
                            <div className="hidden items-center gap-2 text-xs text-text-tertiary sm:flex">
                                <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
                                <span>{isDirty ? 'Editing' : 'No changes'}</span>
                            </div>
                        )}
                        {saveError && (
                            <div className="hidden max-w-48 truncate text-xs text-accent-red-dark md:block">
                                {saveError}
                            </div>
                        )}

                        {!isEditing && (
                            <button
                                onClick={onEdit}
                                className="opaque-toolbar-icon"
                                aria-label="Edit dashboard"
                                title="Edit dashboard"
                            >
                                <IconEdit />
                            </button>
                        )}

                        {isEditing && (
                            <div className="flex items-center gap-2">
                                {isDirty ? (
                                    <>
                                        <button
                                            onClick={onReset}
                                            className="opaque-button"
                                        >
                                            <IconRefresh />
                                            Discard
                                        </button>
                                        <button
                                            onClick={onSave}
                                            disabled={isSaving}
                                            className="opaque-button-primary"
                                        >
                                            {isSaving ? (
                                                <IconLoader2 className="animate-spin" />
                                            ) : (
                                                <IconDeviceFloppy />
                                            )}
                                            Save
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={onReset}
                                        className="opaque-button"
                                    >
                                        <IconCheck />
                                        Done
                                    </button>
                                )}
                            </div>
                        )}

                        <div
                            className="opaque-toolbar-counter"
                            title="Online servers"
                        >
                            <IconServer />
                            {serverSummary.online}/{serverSummary.total}
                        </div>

                        <div className="relative" ref={avatarRef}>
                            <button
                                onClick={() => setShowAvatarDropdown((value) => !value)}
                                className="opaque-toolbar-avatar"
                                aria-label="User menu"
                                aria-expanded={showAvatarDropdown}
                            >
                                {avatarInitial}
                            </button>
                            {showAvatarDropdown && (
                                <div className="opaque-menu-popover">
                                    <div className="opaque-menu-panel">
                                        <div className="opaque-menu-summary">
                                            <div className="text-xs font-medium leading-relaxed">
                                                Server dashboard
                                            </div>
                                            <div className="mt-2.5 h-0.5 rounded-full bg-white/80">
                                                <div
                                                    className="h-full rounded-full bg-accent-green"
                                                    style={{
                                                        width: `${serverSummary.total ? (serverSummary.online / serverSummary.total) * 100 : 0}%`,
                                                    }}
                                                />
                                            </div>
                                            <div className="mt-2.5 font-mono text-xs">
                                                {serverSummary.online} / {serverSummary.total} servers online
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="opaque-menu-profile"
                                        >
                                            <span className="opaque-menu-avatar">
                                                {avatarInitial}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-xs font-semibold text-text-primary">
                                                    {displayName}
                                                </span>
                                                <span className="mt-0.5 block truncate text-[11px] text-text-tertiary">
                                                    View profile
                                                </span>
                                            </span>
                                        </button>

                                        <div className="opaque-menu-section">
                                            <MenuItem
                                                icon={<IconLayoutDashboard />}
                                                label="Dashboard"
                                                onClick={() => setShowAvatarDropdown(false)}
                                            />
                                            <MenuItem
                                                icon={<IconUser />}
                                                label="Personal settings"
                                                badge="Soon"
                                            />
                                            <MenuItem
                                                icon={<IconPalette />}
                                                label="Theme"
                                                trailing={<IconChevronRight />}
                                            />
                                        </div>

                                        <div className="opaque-menu-section px-3.5 py-2.5">
                                            <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                                                Search provider
                                            </div>
                                            <div className="mt-2 grid grid-cols-2 gap-1">
                                                {SEARCH_PROVIDERS.map((provider) => (
                                                    <button
                                                        key={provider.id}
                                                        type="button"
                                                        onClick={() => updateSearchProvider(provider.id)}
                                                        className={`h-6 rounded-sm px-2 text-left text-[11px] transition-colors ${
                                                            searchProviderId === provider.id
                                                                ? 'bg-ink-900 text-white'
                                                                : 'bg-surface-sunken text-text-secondary hover:bg-border-light hover:text-text-primary'
                                                        }`}
                                                    >
                                                        {provider.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="opaque-menu-section">
                                            <MenuItem
                                                icon={<IconServer />}
                                                label="Server monitor"
                                                detail={`${serverSummary.online}/${serverSummary.total}`}
                                            />
                                            <MenuItem
                                                icon={<IconSettings />}
                                                label="Workspace settings"
                                                badge="Soon"
                                            />
                                            <MenuItem
                                                icon={<IconMessageCircle />}
                                                label="Send feedback"
                                                onClick={() => {
                                                    window.location.href = 'mailto:feedback@opaque.local?subject=OPAQUE feedback';
                                                }}
                                            />
                                            <MenuItem
                                                icon={<IconInfoCircle />}
                                                label="About"
                                            />
                                        </div>

                                        <div className="opaque-menu-account">
                                            <div className="truncate">
                                                {accountLabel}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="opaque-menu-item border-t border-border-light"
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
                </nav>
            )}
        </header>
    );
}

function MenuItem({
    icon,
    label,
    detail,
    badge,
    trailing,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    detail?: string;
    badge?: string;
    trailing?: React.ReactNode;
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
            {detail && (
                <span className="opaque-menu-detail">{detail}</span>
            )}
            {badge && (
                <span className="opaque-menu-badge">
                    {badge}
                </span>
            )}
            {trailing && (
                <span className="opaque-menu-item-trailing text-text-tertiary">{trailing}</span>
            )}
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
