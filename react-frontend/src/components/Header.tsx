'use client'

import { usePathname } from 'next/navigation'

export default function Header() {
    const pathname = usePathname()

    return (
        <header className="flex justify-between items-center p-7">
            {pathname === '/login' && (
                <div id="logo" className="font-bold text-lg">OPAQUE</div>
            )}
            {pathname === '/' && (
                <nav>
                    <input 
                        id="search" 
                        type="text" 
                        placeholder="OPAQUE" 
                        autoComplete="off"
                        className="h-8 border-0 border-b border-gray-300 w-50 outline-none"
                    />
                </nav>
            )}
        </header>
    )
} 