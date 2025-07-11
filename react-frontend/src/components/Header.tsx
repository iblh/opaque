'use client'

import { usePathname } from 'next/navigation'

export default function Header() {
    const pathname = usePathname()

    return (
        <header className="flex items-center justify-between bg-white p-4">
            {pathname === '/login' && (
                <div className="text-lg font-bold">OPAQUE</div>
            )}
            {pathname === '/' && (
                <nav>
                    <input 
                        id="search" 
                        type="text" 
                        placeholder="OPAQUE" 
                        autoComplete="off"
                        className="h-8 w-50 border-0 border-b border-gray-300 outline-none focus:border-accent-green focus:ring-0"
                    />
                </nav>
            )}
        </header>
    )
} 