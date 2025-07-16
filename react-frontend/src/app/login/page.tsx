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
                {/* Left side - Form area */}
                <div className="flex w-full lg:w-2/5 h-full items-center justify-center p-6">
                    <div className="w-full max-w-sm">
                        {/* Form container with minimal styling */}
                        <div className="space-y-10 px-2">
                            {/* Brutalist header line */}
                            <div className="w-10 h-3 bg-[#5f7161]"></div>

                            {/* Mode toggle */}
                            <div className="flex border-b border-black">
                                <button
                                    type="button"
                                    onClick={() => { setIsLogin(true); setError(''); }}
                                    className={`relative py-2 px-0 mr-6 text-xs uppercase tracking-widest ${
                                        isLogin 
                                            ? 'font-medium text-black' 
                                            : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    Sign In
                                    {isLogin && <div className="absolute bottom-0 left-0 h-0.5 w-full bg-black" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsLogin(false); setError(''); }}
                                    className={`relative py-2 px-0 text-xs uppercase tracking-widest ${
                                        !isLogin 
                                            ? 'font-medium text-black' 
                                            : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    Sign Up
                                    {!isLogin && <div className="absolute bottom-0 left-0 h-0.5 w-full bg-black" />}
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {!isLogin && (
                                    <div className="space-y-1">
                                        <label className="block text-xs uppercase tracking-wide text-black" htmlFor="name">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            className="w-full border-0 border-b-2 border-black bg-transparent px-0 py-2 text-sm text-black placeholder-gray-400 focus:border-[#5f7161] focus:ring-0"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="block text-xs uppercase tracking-wide text-black" htmlFor="username">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        id="username"
                                        name="username"
                                        required
                                        className="w-full border-0 border-b-2 border-black bg-transparent px-0 py-2 text-sm text-black placeholder-gray-400 focus:border-[#5f7161] focus:ring-0"
                                        placeholder="Choose a username"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs uppercase tracking-wide text-black" htmlFor="password">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        required
                                        className="w-full border-0 border-b-2 border-black bg-transparent px-0 py-2 text-sm text-black placeholder-gray-400 focus:border-[#5f7161] focus:ring-0"
                                        placeholder="Enter your password"
                                    />
                                </div>

                                {!isLogin && (
                                    <div className="space-y-1">
                                        <label className="block text-xs uppercase tracking-wide text-black" htmlFor="confirm-password">
                                            Confirm Password
                                        </label>
                                        <input
                                            type="password"
                                            id="confirm-password"
                                            name="confirm-password"
                                            required
                                            className="w-full border-0 border-b-2 border-black bg-transparent px-0 py-2 text-sm text-black placeholder-gray-400 focus:border-[#5f7161] focus:ring-0"
                                            placeholder="Confirm your password"
                                        />
                                    </div>
                                )}

                                {isLogin && (
                                    <div className="flex items-center space-x-2 mt-4">
                                        <input
                                            type="checkbox"
                                            id="remember"
                                            name="remember"
                                            className="h-4 w-4 rounded-none border-2 border-black text-[#5f7161] focus:ring-0"
                                        />
                                        <label htmlFor="remember" className="text-xs uppercase text-black">
                                            Remember me
                                        </label>
                                    </div>
                                )}

                                {error && (
                                    <div className="border-l-4 border-black bg-gray-100 p-3 text-xs text-black">
                                        {error}
                                    </div>
                                )}

                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="relative w-full border-2 border-black py-3 text-xs uppercase tracking-widest text-black transition-all duration-200 hover:bg-black hover:text-white focus:outline-none focus:ring-1 focus:ring-[#5f7161] focus:ring-offset-1 disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="-ml-1 mr-2 h-3 w-3 animate-spin text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                {isLogin ? "Signing in" : "Creating account"}
                                            </span>
                                        ) : (
                                            isLogin ? "Enter" : "Create"
                                        )}
                                    </button>
                                </div>
                            </form>

                            {/* Footer */}
                            <div className="pt-8">
                                <p className="text-xs text-gray-600">
                                    {isLogin ? "New here? " : "Have an account? "}
                                    <button
                                        type="button"
                                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                                        className="text-[#5f7161] font-medium hover:underline hover:underline-offset-4"
                                    >
                                        {isLogin ? "Create account" : "Sign in"}
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side - Minimalist, wabi-sabi, soft aesthetic */}
                <div className="hidden lg:block lg:w-3/5 h-full relative bg-[#f7f7f5]">
                    {/* Soft, organic, blurred shapes for wabi-sabi effect */}
                    <div className="absolute inset-0 overflow-hidden">
                        {/* Large soft blob 1 */}
                        <div className="absolute top-[20%] left-[10%] w-[32vh] h-[32vh] rounded-full bg-[#e6eae6] blur-2xl opacity-70" style={{ filter: 'blur(32px)' }} />
                        {/* Large soft blob 2 */}
                        <div className="absolute bottom-[10%] right-[8%] w-[40vh] h-[28vh] rounded-full bg-[#e3e6e1] blur-2xl opacity-60" style={{ filter: 'blur(36px)' }} />
                        {/* Small accent blob */}
                        <div className="absolute top-[60%] left-[30%] w-[12vh] h-[10vh] rounded-full bg-[#5f7161] blur-2xl opacity-20" style={{ filter: 'blur(18px)' }} />
                        {/* Subtle imperfect ellipse */}
                        <div className="absolute top-[40%] right-[20%] w-[22vh] h-[10vh] rounded-full bg-[#f0f1ee] blur-xl opacity-80 rotate-[12deg]" style={{ filter: 'blur(16px)' }} />
                        {/* Gentle shadow for depth */}
                        <div className="absolute bottom-0 left-1/2 w-[60%] h-[8vh] bg-black opacity-5 rounded-full blur-2xl -translate-x-1/2" />
                    </div>
                </div>
            </div>
        </div>
    )
} 