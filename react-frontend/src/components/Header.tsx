'use client'

import { usePathname, useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

export default function Header() {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = () => {
        Cookies.remove('jwt_token')
        router.push('/login')
    }

    const handleEditDashboard = () => {
        // TODO: Implement edit dashboard functionality
        console.log('Edit dashboard functionality to be implemented')
    }

    return (
        <header className="flex items-center justify-between px-6 py-4 border-b border-border-light">
            {pathname === '/login' && (
                <div className="text-lg font-medium tracking-tight text-text-primary">OPAQUE</div>
            )}
            {pathname === '/' && (
                <nav className="w-full flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium tracking-tight text-text-primary">OPAQUE</div>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="relative">
                            <input 
                                id="search" 
                                type="text" 
                                placeholder="Search..." 
                                autoComplete="off"
                                className="linear-input w-60 pl-8"
                            />
                            <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-tertiary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleEditDashboard}
                                className="text-xs uppercase tracking-wider text-text-tertiary hover:text-text-primary transition-colors duration-200"
                            >
                                Edit
                            </button>
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
    )
} 