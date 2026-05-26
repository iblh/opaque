'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    IconDeviceFloppy,
    IconEdit,
    IconLoader2,
    IconLogout,
    IconRefresh,
    IconSearch,
    IconSettings,
} from '@tabler/icons-react';
import { Dashboard } from '@/lib/types';

interface HeaderProps {
    dashboard?: Dashboard | null;
    isEditing?: boolean;
    isDirty?: boolean;
    isSaving?: boolean;
    saveError?: string;
    searchTerm?: string;
    onSearchTermChange?: (value: string) => void;
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
    searchTerm = '',
    onSearchTermChange,
    onEdit,
    onSave,
    onReset,
}: HeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [showSettings, setShowSettings] = useState(false);
    const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);
    const avatarRef = useRef<HTMLDivElement>(null);
    const displayName = dashboard?.name || dashboard?.username || dashboard?.email || 'User';

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setShowSettings(false);
            }
            if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
                setShowAvatarDropdown(false);
            }
        }

        if (showSettings || showAvatarDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSettings, showAvatarDropdown]);

    const handleLogout = async () => {
        await fetch('/api/user/logout', { method: 'POST' });
        router.push('/login');
    };

    const closeAndRun = (callback?: () => void) => {
        setShowSettings(false);
        callback?.();
    };

    return (
        <header className="flex min-h-14 items-center justify-between border-b border-border-light bg-white px-6 py-3">
            {pathname === '/login' && (
                <div className="text-sm font-medium tracking-tight text-text-primary">OPAQUE</div>
            )}

            {pathname === '/' && (
                <nav className="flex w-full items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="text-sm font-medium tracking-tight text-text-primary">
                            OPAQUE
                        </div>
                        <div className="relative hidden sm:block">
                            <input
                                id="search"
                                type="text"
                                value={searchTerm}
                                onChange={(event) => onSearchTermChange?.(event.target.value)}
                                placeholder="Search"
                                autoComplete="off"
                                className="peer h-8 w-[min(22rem,34vw)] rounded-sm border-0 bg-transparent px-3 pr-8 text-sm text-text-primary placeholder-text-tertiary hover:bg-surface-sunken hover:ring-1 hover:ring-neutral-200 focus:bg-surface-sunken focus:ring-1 focus:ring-neutral-200"
                            />
                            <IconSearch className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isEditing && (
                            <div className="hidden items-center gap-2 text-xs text-text-tertiary sm:flex">
                                <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
                                <span>{isDirty ? 'Editing' : 'No changes'}</span>
                            </div>
                        )}
                        {saveError && (
                            <div className="hidden max-w-48 truncate text-xs text-red-500 md:block">
                                {saveError}
                            </div>
                        )}

                        <div className="relative" ref={settingsRef}>
                            <button
                                onClick={() => setShowSettings((value) => !value)}
                                className="flex h-7 w-7 items-center justify-center rounded-sm bg-surface-sunken text-text-secondary duration-200 hover:ring-1 hover:ring-neutral-200"
                                aria-label="Settings"
                            >
                                <IconSettings className="h-4 w-4" />
                            </button>

                            {showSettings && (
                                <div className="absolute right-0 top-full z-50 mt-2">
                                    <div className="min-w-[160px] rounded-sm border border-neutral-200 bg-white p-2 shadow-lg">
                                        {!isEditing && (
                                            <button
                                                onClick={() => closeAndRun(onEdit)}
                                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-surface-sunken"
                                            >
                                                <IconEdit className="h-3.5 w-3.5" />
                                                Edit dashboard
                                            </button>
                                        )}

                                        {isEditing && (
                                            <>
                                                <button
                                                    onClick={() => closeAndRun(onSave)}
                                                    disabled={!isDirty || isSaving}
                                                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs font-medium hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-45"
                                                >
                                                    {isSaving ? (
                                                        <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <IconDeviceFloppy className="h-3.5 w-3.5" />
                                                    )}
                                                    Save changes
                                                </button>
                                                <button
                                                    onClick={() => closeAndRun(onReset)}
                                                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-surface-sunken"
                                                >
                                                    <IconRefresh className="h-3.5 w-3.5" />
                                                    Reset
                                                </button>
                                            </>
                                        )}

                                        <div className="my-1 h-px bg-neutral-200" />
                                        <button
                                            onClick={handleLogout}
                                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-red-500 hover:bg-surface-sunken"
                                        >
                                            <IconLogout className="h-3.5 w-3.5" />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative" ref={avatarRef}>
                            <button
                                onClick={() => setShowAvatarDropdown((value) => !value)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-200 text-sm text-text-primary"
                                aria-label="User menu"
                            >
                                {displayName.charAt(0).toUpperCase()}
                            </button>
                            {showAvatarDropdown && (
                                <div className="absolute right-0 top-full z-50 mt-2 min-w-[190px]">
                                    <div className="flex flex-col items-start rounded-sm border border-neutral-200 bg-white p-4 shadow-lg">
                                        <div className="mb-2 w-full">
                                            <div className="text-sm font-semibold text-text-primary">
                                                {displayName}
                                            </div>
                                            <div className="break-all text-xs text-text-tertiary">
                                                {dashboard?.email || dashboard?.username || ''}
                                            </div>
                                        </div>
                                        <div className="my-2 w-full border-t border-neutral-200" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full rounded-sm px-2 py-1.5 text-left text-xs text-red-500 hover:bg-surface-sunken"
                                        >
                                            Logout
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
