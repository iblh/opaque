'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    IconCheck,
    IconDeviceFloppy,
    IconEdit,
    IconLoader2,
    IconRefresh,
    IconSearch,
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
    const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
    const avatarRef = useRef<HTMLDivElement>(null);
    const displayName = dashboard?.name || dashboard?.username || dashboard?.email || 'User';

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

    const handleLogout = async () => {
        await fetch('/api/user/logout', { method: 'POST' });
        router.push('/login');
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
                        <div className="relative hidden sm:block">
                            <input
                                id="search"
                                type="text"
                                value={searchTerm}
                                onChange={(event) => onSearchTermChange?.(event.target.value)}
                                placeholder="Search"
                                autoComplete="off"
                                className="peer arena-input w-[min(22rem,34vw)] pr-8"
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

                        {!isEditing && (
                            <button
                                onClick={onEdit}
                                className="arena-button"
                            >
                                <IconEdit className="h-3.5 w-3.5" />
                                Edit
                            </button>
                        )}

                        {isEditing && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onReset}
                                    className="arena-button"
                                >
                                    {isDirty ? (
                                        <IconRefresh className="h-3.5 w-3.5" />
                                    ) : (
                                        <IconCheck className="h-3.5 w-3.5" />
                                    )}
                                    {isDirty ? 'Discard' : 'Done'}
                                </button>
                                <button
                                    onClick={onSave}
                                    disabled={!isDirty || isSaving}
                                    className="arena-button-primary"
                                >
                                    {isSaving ? (
                                        <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <IconDeviceFloppy className="h-3.5 w-3.5" />
                                    )}
                                    Save
                                </button>
                            </div>
                        )}

                        <div className="relative" ref={avatarRef}>
                            <button
                                onClick={() => setShowAvatarDropdown((value) => !value)}
                                className="flex h-7 w-7 items-center justify-center rounded-sm border border-border-light bg-white text-sm text-text-primary transition-colors duration-200 hover:bg-surface-sunken"
                                aria-label="User menu"
                            >
                                {displayName.charAt(0).toUpperCase()}
                            </button>
                            {showAvatarDropdown && (
                                <div className="absolute right-0 top-full z-50 mt-2 min-w-[190px]">
                                    <div className="flex flex-col items-start rounded-sm border border-border-light bg-white p-4 shadow-none">
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
