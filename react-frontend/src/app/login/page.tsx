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
        <div className="bg-wabi-base relative overflow-hidden min-h-screen">
            {/* Wabi-Sabi backdrop elements */}
            <div className="wabi-circle" style={{ '--blur-size': '24rem', '--opacity': '0.03', top: '15%', left: '25%' } as React.CSSProperties}></div>
            <div className="wabi-circle" style={{ '--blur-size': '16rem', '--opacity': '0.02', bottom: '25%', right: '20%' } as React.CSSProperties}></div>
            <div className="wabi-overlay"></div>

            {/* Subtle geometric accents - Brutalist structure */}
            <div className="brutalist-line" style={{ top: 'var(--space-xl)', right: 'var(--space-lg)', width: '3rem', height: '1px' } as React.CSSProperties}></div>
            <div className="brutalist-line" style={{ bottom: 'var(--space-lg)', left: '60%', width: '1px', height: '3rem' } as React.CSSProperties}></div>

            <div className="relative z-10 flex min-h-screen">
                {/* Left side - Organic asymmetrical space */}
                <div className="w-2/5 relative flex items-center justify-center max-md:hidden">
                    <div className="relative">
                        {/* Subtle geometric accent - Brutalist structure */}
                        <div className="brutalist-line" style={{ top: '-2rem', left: '-1rem', width: '4rem', height: '1px' } as React.CSSProperties}></div>
                        <div className="brutalist-line brutalist-accent" style={{ bottom: '-1.5rem', right: '-0.5rem', width: '3rem', height: '1px' } as React.CSSProperties}></div>

                        <div className="backdrop-blur-sm bg-white/20 p-12 border-l-2 border-stone-300/40">
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
                <div className="flex-1 flex items-center justify-start px-8 md:pl-16 md:pr-12">
                    <div className="w-full max-w-sm">
                        {/* Header with natural hierarchy */}
                        <div className="mb-12 space-y-6">
                            <div className="brutalist-line" style={{ width: '2rem', height: '1px' } as React.CSSProperties}></div>
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
                        <div className="flex mb-10 bg-stone-100/40 backdrop-blur-sm border border-stone-200/30 overflow-hidden">
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
                                <div className="space-y-2 animate-fadeIn">
                                    <label htmlFor="name" className="form-label">
                                        Name
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            className="form-input"
                                            placeholder="Your full name"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label htmlFor="username" className="form-label">
                                    Username
                                </label>
                                <div className="relative">
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        className="form-input"
                                        placeholder="Choose a username"
                                        spellCheck="false"
                                        autoComplete="off"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="form-label">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        className="form-input"
                                        placeholder="Enter password"
                                        required
                                    />
                                </div>
                            </div>

                            {!isLogin && (
                                <div className="space-y-2 animate-fadeIn">
                                    <label htmlFor="confirm-password" className="form-label">
                                        Confirm
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="confirm-password"
                                            name="confirm-password"
                                            type="password"
                                            className="form-input"
                                            placeholder="Confirm password"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {isLogin && (
                                <div className="flex items-center space-x-3">
                                    <input
                                        id="remember"
                                        name="remember"
                                        type="checkbox"
                                        className="form-checkbox"
                                    />
                                    <label htmlFor="remember" className="text-xs text-stone-600/80 font-medium cursor-pointer select-none">
                                        remember me
                                    </label>
                                </div>
                            )}

                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn-primary w-full"
                                >
                                    {isLoading 
                                        ? (isLogin ? "Signing in..." : "Creating account...")
                                        : (isLogin ? "Continue" : "Create Account")
                                    }
                                </button>
                            </div>

                            {error && (
                                <div className="pt-4 animate-fadeIn">
                                    <div className="text-red-600/80 text-xs font-medium p-3 bg-red-50/80 border border-red-200/40 backdrop-blur-sm">
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
        </div>
    )
} 