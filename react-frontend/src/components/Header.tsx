'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Dashboard } from '@/lib/types';

interface HeaderProps {
    dashboard?: Dashboard | null;
    setDashboard?: React.Dispatch<React.SetStateAction<Dashboard | null>>;
}

export default function Header({ dashboard, setDashboard }: HeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [showSettings, setShowSettings] = useState(false);
    const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);
    const avatarRef = useRef<HTMLDivElement>(null);

    // Close settings dropdown when clicking outside
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
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSettings, showAvatarDropdown]);

    const handleLogout = async () => {
        await fetch('/api/user/logout', { method: 'POST' });
        router.push('/login');
    };

    const openSettings = () => {
        setShowSettings(true);
    };

    const saveSettings = () => {
        console.log(dashboard);
        setShowSettings(false);
    };

    const cancelSettings = () => {
        setShowSettings(false);
    };

    return (
        <header className="flex items-center justify-between px-6 py-4">
            {pathname === '/login' && (
                <div className="text-lg font-medium tracking-tight text-text-primary">OPAQUE</div>
            )}
            {pathname === '/' && (
                <nav className="w-full flex items-center justify-between">
                    <div className="flex items-center space-x-4 ">
                        <div className="text-sm font-medium tracking-tight text-text-primary">
                            OPAQUE
                        </div>
                        <div className="relative pl-2">
                            <input
                                id="search"
                                type="text"
                                placeholder="Search"
                                autoComplete="off"
                                className="peer border-0 rounded-xs px-3 py-2 text-sm text-text-primary placeholder-text-tertiary hover:bg-surface-sunken hover:ring-1 hover:ring-neutral-200 focus:ring-1 focus:ring-neutral-200 focus:bg-surface-sunken w-[300px]"
                            />
                            <kbd
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 text-md text-gray-500 invisible peer-hover:visible peer-focus:invisible pointer-events-none"
                            >
                                /
                            </kbd>
                            <svg
                                className="absolute right-2.5 top-3 h-3.5 w-3.5 text-text-tertiary invisible peer-focus:visible"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {/* Settings button */}
                        <div className="relative" ref={settingsRef}>
                            <button
                                onClick={() => setShowSettings(v => !v)}
                                className="flex items-center justify-center text-xs leading-none bg-surface-sunken rounded-sm px-3 h-6 tracking-wider font-bold hover:ring-1 hover:ring-neutral-200 duration-200"
                            >
                                Settings
                            </button>
                            {/* Settings panel */}
                            {showSettings && (
                                <div className="absolute right-0 top-full mt-2 z-50">
                                    <div className="bg-white border border-neutral-200 rounded-sm shadow-lg p-3 min-w-[120px]">
                                        <button
                                            onClick={cancelSettings}
                                            className="w-full text-left text-xs py-1.5 mb-1 hover:bg-surface-sunken px-2 rounded-sm"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            onClick={saveSettings}
                                            className="w-full text-left text-xs py-1.5 mb-1 hover:bg-surface-sunken px-2 rounded-sm font-medium"
                                        >
                                            Save
                                        </button>
                                        <div className="h-px bg-neutral-200 my-1"></div>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left text-xs py-1.5 hover:bg-surface-sunken px-2 rounded-sm text-red-500"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Avatar button */}
                        <div className="relative" ref={avatarRef}>
                            <button
                                onClick={() => setShowAvatarDropdown(v => !v)}
                                className="flex items-center justify-center w-6 h-6 rounded-full bg-ink-200 text-sm text-text-primary"
                                aria-label="User menu"
                            >
                                {dashboard?.name ? dashboard.name.charAt(0).toUpperCase() : '?'}
                            </button>
                            {showAvatarDropdown && (
                                <div className="absolute right-0 top-full mt-2 z-50 min-w-[180px]">
                                    <div className="bg-white border border-neutral-200 rounded-sm shadow-lg p-4 flex flex-col items-start">
                                        <div className="mb-2 w-full">
                                            <div className="text-sm font-semibold text-text-primary">
                                                {dashboard?.name || 'User'}
                                            </div>
                                            <div className="text-xs text-text-tertiary break-all">
                                                {dashboard?.email || ''}
                                            </div>
                                        </div>
                                        <div className="w-full border-t border-neutral-200 my-2"></div>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left text-xs py-1.5 hover:bg-surface-sunken px-2 rounded-sm text-red-500"
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
