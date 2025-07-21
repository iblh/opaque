'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/user/logout', { method: 'POST' });
        router.push('/login');
    };

    const handleEditDashboard = () => {
        // TODO: Implement edit dashboard functionality
        console.log('Edit dashboard functionality to be implemented');
    };

    return (
        <header className="flex items-center justify-between px-6 py-4">
            {pathname === '/login' && (
                <div className="text-lg font-medium tracking-tight text-text-primary">OPAQUE</div>
            )}
            {pathname === '/' && (
                <nav className="w-full flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium tracking-tight text-text-primary">
                            OPAQUE
                        </div>
                    </div>
                    <div className="flex items-center space-x-6 ">
                        <div className="relative">
                            <input
                                id="search"
                                type="text"
                                placeholder="Search"
                                autoComplete="off"
                                className="peer border-0 rounded-sm px-3 py-2 text-sm text-text-primary placeholder-text-tertiary hover:bg-surface-sunken hover:ring-1 hover:ring-gray-200 focus:ring-1 focus:ring-gray-200 focus:bg-surface-sunken w-60"
                            />
                            <kbd
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs bg-gray-100 border border-gray-300 rounded px-1 py-0.5 text-gray-500 shadow-sm invisible peer-hover:visible peer-focus:invisible transition"
                            >
                                /
                            </kbd>
                            <svg
                                className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-text-tertiary invisible peer-focus:visible"
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
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleLogout}
                                className="text-xs uppercase tracking-wider text-text-tertiary hover:text-text-primary transition-colors duration-200"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </nav>
            )}
        </header>
    );
}
