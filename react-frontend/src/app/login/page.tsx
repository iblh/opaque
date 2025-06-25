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
        <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 relative overflow-hidden">
            {/* Subtle backdrop elements - Wabi-Sabi imperfections */}
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-100/20 via-transparent to-stone-200/10"></div>
            <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-amber-200/5 blur-3xl rounded-full"></div>
            <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-stone-300/8 blur-2xl rounded-full"></div>

            <div className="relative z-10 flex min-h-screen">
                {/* Left side - Organic asymmetrical space */}
                <div className="w-2/5 relative flex items-center justify-center">
                    <div className="relative">
                        {/* Subtle geometric accent - Brutalist structure */}
                        <div className="absolute -top-8 -left-4 w-16 h-0.5 bg-stone-400/60"></div>
                        <div className="absolute -bottom-6 -right-2 w-12 h-0.5 bg-amber-600/40"></div>

                        <div className="backdrop-blur-sm bg-white/30 p-12 border-l-2 border-stone-300/50">
                            <div className="space-y-6">
                                <div className="text-xs uppercase tracking-widest text-stone-600/80 font-medium">For Creators</div>
                                <div className="text-stone-700/90 text-sm leading-relaxed max-w-xs">
                                    A mindful space designed for designers, engineers, and artists who value both function and form.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side - Form area with organic spacing */}
                <div className="flex-1 flex items-center justify-start pl-16 pr-12">
                    <div className="w-full max-w-sm">
                        {/* Header with natural hierarchy */}
                        <div className="mb-12 space-y-6">
                            <div className="w-8 h-0.5 bg-stone-400/70"></div>
                            <div>
                                <h1 className="text-2xl font-light text-stone-800 mb-3 tracking-tight">
                                    {isLogin ? "Welcome back" : "Join us"}
                                </h1>
                                <p className="text-xs text-stone-600/80 leading-relaxed">
                                    {isLogin ? "Continue your creative journey" : "Become part of our mindful community"}
                                </p>
                            </div>
                        </div>

                        {/* Minimalist toggle */}
                        <div className="flex mb-10 bg-stone-100/50 backdrop-blur-sm border border-stone-200/30">
                            <button
                                type="button"
                                onClick={() => { setIsLogin(true); setError(''); }}
                                className={`flex-1 py-3 px-4 text-xs uppercase tracking-wider font-medium transition-all duration-300 ${isLogin 
                                    ? 'bg-stone-800/90 text-stone-50 shadow-sm' 
                                    : 'text-stone-600/70 hover:text-stone-800/90 hover:bg-stone-50/50'}`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsLogin(false); setError(''); }}
                                className={`flex-1 py-3 px-4 text-xs uppercase tracking-wider font-medium transition-all duration-300 ${!isLogin 
                                    ? 'bg-stone-800/90 text-stone-50 shadow-sm' 
                                    : 'text-stone-600/70 hover:text-stone-800/90 hover:bg-stone-50/50'}`}
                            >
                                Sign Up
                            </button>
                        </div>

                        {/* Form with organic spacing */}
                        <form className="space-y-8" onSubmit={handleSubmit}>
                            {!isLogin && (
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-xs uppercase tracking-wider text-stone-700/80 font-medium">
                                        Name
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            className="w-full px-0 py-3 bg-transparent border-0 border-b border-stone-300/40 focus:border-stone-500/60 focus:ring-0 text-stone-800 text-sm placeholder:text-stone-400/60 transition-colors duration-300 outline-none"
                                            placeholder="Your full name"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label htmlFor="username" className="text-xs uppercase tracking-wider text-stone-700/80 font-medium">
                                    Username
                                </label>
                                <div className="relative">
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        className="w-full px-0 py-3 bg-transparent border-0 border-b border-stone-300/40 focus:border-stone-500/60 focus:ring-0 text-stone-800 text-sm placeholder:text-stone-400/60 transition-colors duration-300 outline-none"
                                        placeholder="Choose a username"
                                        spellCheck="false"
                                        autoComplete="off"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-xs uppercase tracking-wider text-stone-700/80 font-medium">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        className="w-full px-0 py-3 bg-transparent border-0 border-b border-stone-300/40 focus:border-stone-500/60 focus:ring-0 text-stone-800 text-sm placeholder:text-stone-400/60 transition-colors duration-300 outline-none"
                                        placeholder="Enter password"
                                        required
                                    />
                                </div>
                            </div>

                            {!isLogin && (
                                <div className="space-y-2">
                                    <label htmlFor="confirm-password" className="text-xs uppercase tracking-wider text-stone-700/80 font-medium">
                                        Confirm
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="confirm-password"
                                            name="confirm-password"
                                            type="password"
                                            className="w-full px-0 py-3 bg-transparent border-0 border-b border-stone-300/40 focus:border-stone-500/60 focus:ring-0 text-stone-800 text-sm placeholder:text-stone-400/60 transition-colors duration-300 outline-none"
                                            placeholder="Confirm password"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {isLogin && (
                                /* Remember me checkbox for login only */
                                <div className="flex items-center space-x-3">
                                    <input
                                        id="remember"
                                        name="remember"
                                        type="checkbox"
                                        className="w-4 h-4 text-stone-800 bg-transparent border border-stone-300/40 rounded focus:ring-stone-500/60 focus:ring-2"
                                    />
                                    <label htmlFor="remember" className="text-xs text-stone-600/80 font-medium cursor-pointer">
                                        remember me
                                    </label>
                                </div>
                            )}

                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-stone-800/90 hover:bg-stone-900 disabled:bg-stone-600/50 text-stone-50 py-3 px-6 text-xs uppercase tracking-widest font-medium transition-all duration-300 shadow-sm hover:shadow-md backdrop-blur-sm disabled:cursor-not-allowed"
                                >
                                    {isLoading 
                                        ? (isLogin ? "Signing in..." : "Creating account...")
                                        : (isLogin ? "Continue" : "Create Account")
                                    }
                                </button>
                            </div>

                            {error && (
                                <div className="pt-4">
                                    <div className="text-red-600/80 text-xs font-medium">
                                        {error}
                                    </div>
                                </div>
                            )}
                        </form>

                        {/* Minimal footer */}
                        <div className="mt-10 pt-6 border-t border-stone-200/30">
                            <p className="text-xs text-stone-500/70 leading-relaxed">
                                {isLogin ? "New here?" : "Already joined?"}{" "}
                                <button
                                    type="button"
                                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                                    className="text-stone-700/80 hover:text-stone-900 font-medium underline underline-offset-2 decoration-stone-300/50 hover:decoration-stone-500/70 transition-colors duration-300 ml-1"
                                >
                                    {isLogin ? "Create account" : "Sign in"}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subtle geometric accents - Brutalist structure */}
            <div className="absolute top-6 right-8 w-12 h-0.5 bg-stone-400/40"></div>
            <div className="absolute bottom-8 left-2/3 w-0.5 h-12 bg-amber-600/30"></div>
        </div>
    )
} 