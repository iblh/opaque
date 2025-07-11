'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

export default function LoginPage() {
    const [error, setError] = useState('')
    const [isLogin, setIsLogin] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError('')
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        const username = formData.get('username') as string
        const password = formData.get('password') as string
        const name = formData.get('name') as string
        const confirmPassword = formData.get('confirm-password') as string
        const remember = formData.get('remember') as string

        // Basic validation
        if (!username || !password) {
            setError('Username and password are required')
            setIsLoading(false)
            return
        }

        // Signup specific validation
        if (!isLogin) {
            if (password !== confirmPassword) {
                setError('Passwords do not match')
                setIsLoading(false)
                return
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters')
                setIsLoading(false)
                return
            }
        }

        let expires_in = '3d'
        let expires_time = new Date(Date.now() + 3 * 86400 * 1000)

        if (remember) {
            expires_in = '90d'
            expires_time = new Date(Date.now() + 90 * 86400 * 1000)
        }

        try {
            const endpoint = isLogin ? '/api/user/login' : '/api/user/signup'
            const requestBody = isLogin 
                ? { username, password, expires_in }
                : { username, password, name, expires_in }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            })

            const result = await res.json()

            if (res.status === 200 || res.status === 201) {
                // store the JWT token in cookie
                Cookies.set('jwt_token', result.jwt_token, { expires: expires_time })
                router.push('/')
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="h-full bg-white relative overflow-hidden">
            <div className="relative z-10 flex h-full w-full">
                {/* Left side - Aesthetic space */}
                <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                        {/* Brutalist grid pattern */}
                        <div className="grid grid-cols-6 gap-px opacity-5">
                            {Array.from({ length: 36 }).map((_, i) => (
                                <div key={i} className="w-8 h-8 bg-stone-800"></div>
                            ))}
                        </div>
                    </div>

                    <div className="relative w-full h-full flex items-center justify-center p-12">
                        <div className="relative max-w-lg">
                            {/* Brutalist accent lines */}
                            <div className="absolute -top-8 left-0 w-12 h-px bg-stone-400/40"></div>
                            <div className="absolute -bottom-8 right-0 w-12 h-px bg-stone-400/40"></div>

                            {/* Content */}
                            <div className="space-y-12">
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-6 h-px bg-stone-400/60" />
                                        <span className="text-xs uppercase tracking-widest text-stone-600/80">Workspace</span>
                                    </div>
                                    <h1 className="text-4xl font-light tracking-tight leading-tight text-stone-800/90">
                                        A mindful space<br />for digital craft
                                    </h1>
                                </div>

                                <div className="prose prose-sm space-y-4 text-stone-600/80">
                                    <p className="text-sm leading-relaxed">
                                        Welcome to a thoughtfully designed environment where form and function achieve perfect harmony. A space that adapts to your workflow, not the other way around.
                                    </p>
                                    <div className="grid grid-cols-2 gap-8 pt-4">
                                        <div>
                                            <div className="mb-3 h-px w-4 bg-amber-400/40" />
                                            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-700/90">Mindful Design</h3>
                                            <p className="text-xs leading-relaxed text-stone-600/70">
                                                Every interaction is crafted with intention, creating a calm, focused environment for your work.
                                            </p>
                                        </div>
                                        <div>
                                            <div className="mb-3 h-px w-4 bg-amber-400/40" />
                                            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-700/90">Adaptive Flow</h3>
                                            <p className="text-xs leading-relaxed text-stone-600/70">
                                                Seamlessly organize your digital tools and resources in a way that feels natural.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side - Form area */}
                <div className="flex w-full items-center justify-center p-8 lg:w-1/2 lg:p-12 xl:w-2/5">
                    <div className="w-full max-w-sm">
                        {/* Form container with subtle backdrop */}
                        <div className="relative border-l border-stone-200/60 bg-white/40 p-8 backdrop-blur-sm">
                            {/* Brutalist accent */}
                            <div className="absolute -top-px left-0 h-px w-12 bg-stone-400/40" />

                            <div className="space-y-8">
                                {/* Header */}
                                <div className="space-y-2">
                                    <h2 className="text-xl font-light tracking-tight text-stone-800/90">
                                        {isLogin ? "Welcome back" : "Join the space"}
                                    </h2>
                                    <p className="text-xs text-stone-600/70">
                                        {isLogin 
                                            ? "Continue your creative journey" 
                                            : "Begin crafting your digital workspace"
                                        }
                                    </p>
                                </div>

                                {/* Mode toggle */}
                                <div className="flex border-b border-stone-200/60">
                                    <button
                                        type="button"
                                        onClick={() => { setIsLogin(true); setError(''); }}
                                        className={`relative py-2 px-4 text-xs uppercase tracking-wider ${
                                            isLogin 
                                                ? 'font-medium text-stone-800' 
                                                : 'text-stone-500/70 hover:text-stone-600'
                                        }`}
                                    >
                                        Sign In
                                        {isLogin && <div className="absolute bottom-0 left-0 h-px w-full bg-stone-800" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setIsLogin(false); setError(''); }}
                                        className={`relative py-2 px-4 text-xs uppercase tracking-wider ${
                                            !isLogin 
                                                ? 'font-medium text-stone-800' 
                                                : 'text-stone-500/70 hover:text-stone-600'
                                        }`}
                                    >
                                        Sign Up
                                        {!isLogin && <div className="absolute bottom-0 left-0 h-px w-full bg-stone-800" />}
                                    </button>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {!isLogin && (
                                        <div className="space-y-2">
                                            <label className="block text-xs uppercase tracking-wider text-stone-600/80" htmlFor="name">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                className="w-full border-0 border-b border-stone-200/60 bg-transparent px-0 py-2 text-sm text-stone-800 placeholder-stone-400/60 focus:border-stone-400 focus:ring-0"
                                                placeholder="Enter your name"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="block text-xs uppercase tracking-wider text-stone-600/80" htmlFor="username">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            id="username"
                                            name="username"
                                            required
                                            className="w-full border-0 border-b border-stone-200/60 bg-transparent px-0 py-2 text-sm text-stone-800 placeholder-stone-400/60 focus:border-stone-400 focus:ring-0"
                                            placeholder="Choose a username"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs uppercase tracking-wider text-stone-600/80" htmlFor="password">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            id="password"
                                            name="password"
                                            required
                                            className="w-full border-0 border-b border-stone-200/60 bg-transparent px-0 py-2 text-sm text-stone-800 placeholder-stone-400/60 focus:border-stone-400 focus:ring-0"
                                            placeholder="Enter your password"
                                        />
                                    </div>

                                    {!isLogin && (
                                        <div className="space-y-2">
                                            <label className="block text-xs uppercase tracking-wider text-stone-600/80" htmlFor="confirm-password">
                                                Confirm Password
                                            </label>
                                            <input
                                                type="password"
                                                id="confirm-password"
                                                name="confirm-password"
                                                required
                                                className="w-full border-0 border-b border-stone-200/60 bg-transparent px-0 py-2 text-sm text-stone-800 placeholder-stone-400/60 focus:border-stone-400 focus:ring-0"
                                                placeholder="Confirm your password"
                                            />
                                        </div>
                                    )}

                                    {isLogin && (
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="remember"
                                                name="remember"
                                                className="h-4 w-4 rounded border-stone-300 text-stone-600 focus:ring-stone-400/50"
                                            />
                                            <label htmlFor="remember" className="text-xs text-stone-600/80">
                                                Remember me
                                            </label>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="border-l-2 border-red-200/60 bg-red-50/50 p-3 text-xs text-red-600/90">
                                            {error}
                                        </div>
                                    )}

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="relative w-full border border-stone-800/90 py-3 text-sm font-medium uppercase tracking-wider text-stone-800 transition-all duration-200 hover:bg-stone-800/90 hover:text-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isLoading ? (
                                                <span className="flex items-center justify-center">
                                                    <svg className="-ml-1 mr-3 h-4 w-4 animate-spin text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    {isLogin ? "Signing in..." : "Creating account..."}
                                                </span>
                                            ) : (
                                                isLogin ? "Enter Workspace" : "Create Workspace"
                                            )}
                                        </button>
                                    </div>
                                </form>

                                {/* Footer */}
                                <div className="border-t border-stone-200/40 pt-6">
                                    <p className="text-xs text-stone-500/70">
                                        {isLogin ? "New to the workspace? " : "Already have an account? "}
                                        <button
                                            type="button"
                                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                                            className="text-stone-800/90 underline underline-offset-2 hover:text-stone-900"
                                        >
                                            {isLogin ? "Create an account" : "Sign in"}
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 