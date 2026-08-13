'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProviders, signIn } from 'next-auth/react';
import { IconBrandGithub } from '@tabler/icons-react';

// The sign-in page is the product's first impression, so it is held to the same
// Quiet Instrumentality rules as the dashboard: tokenized colour, hairline
// rules, mono for data and labels, serif reserved for the one title. Nothing
// here animates and nothing simulates activity — the page states what it is and
// gets out of the way.

type Mode = 'login' | 'register';

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>('login');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasGitHubProvider, setHasGitHubProvider] = useState(false);

    const isLogin = mode === 'login';

    useEffect(() => {
        let active = true;
        getProviders()
            .then((providers) => {
                if (active) setHasGitHubProvider(Boolean(providers?.github));
            })
            .catch(() => {
                // A missing provider list just means no third-party button.
                if (active) setHasGitHubProvider(false);
            });
        return () => {
            active = false;
        };
    }, []);

    const switchMode = (next: Mode) => {
        setMode(next);
        setError('');
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setIsLoading(true);

        const formData = new FormData(event.currentTarget);
        const identifier = formData.get('identifier') as string;
        const password = formData.get('password') as string;
        const name = formData.get('name') as string;
        const confirmPassword = formData.get('confirm-password') as string;

        if (!identifier || !password) {
            setError('Enter your email or username, and your password.');
            setIsLoading(false);
            return;
        }

        if (!isLogin) {
            if (password !== confirmPassword) {
                setError('The two passwords don’t match.');
                setIsLoading(false);
                return;
            }
            if (password.length < 6) {
                setError('Use at least 6 characters for the password.');
                setIsLoading(false);
                return;
            }
        }

        try {
            const endpoint = isLogin ? '/api/user/login' : '/api/user/signup';
            const requestBody = isLogin
                ? { identifier, password }
                : { identifier, password, name };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const result = await res.json().catch(() => ({}));

            if (res.status === 200 || res.status === 201) {
                router.push('/');
                return;
            }

            setError(result.error || describeStatus(res.status, isLogin));
        } catch {
            // Self-hosted: an unreachable server is the likeliest cause, so say
            // that rather than the generic "network error".
            setError('Couldn’t reach the server. Check that OPAQUE is running, then try again.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-background text-text-primary">
            <main className="flex flex-1 items-center justify-center px-5 py-16 sm:px-6">
                <section className="w-full max-w-[24rem]">
                    <header className="border-b border-text-primary pb-4">
                        <h1 className="font-serif text-3xl leading-none tracking-tight">OPAQUE</h1>
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                            Personal archive instrument
                        </p>
                    </header>

                    {/* A segmented control, not a tab set: both choices drive the
                        same form rather than swapping panels, so the ARIA tab
                        pattern (tabpanel, roving arrow keys) would promise
                        navigation that isn't there. `aria-pressed` states the
                        toggle honestly and needs no extra key handling. */}
                    <div
                        role="group"
                        aria-label="Sign in or create an account"
                        className="mt-6 flex items-center gap-5 font-mono text-[10px] uppercase tracking-widest"
                    >
                        <ModeTab active={isLogin} onClick={() => switchMode('login')}>
                            Sign in
                        </ModeTab>
                        <ModeTab active={!isLogin} onClick={() => switchMode('register')}>
                            Create account
                        </ModeTab>
                    </div>

                    <form
                        id="auth-form"
                        onSubmit={handleSubmit}
                        className="mt-7 space-y-5"
                        noValidate
                    >
                        {!isLogin && (
                            <AuthInput
                                id="name"
                                name="name"
                                label="Name"
                                autoComplete="name"
                                placeholder="Ada Lovelace"
                                // A display name is prose — let the keyboard
                                // capitalise it as it would any other name.
                                isCredential={false}
                            />
                        )}

                        <AuthInput
                            id="identifier"
                            name="identifier"
                            label="Email or username"
                            autoComplete="username"
                            placeholder="you@example.com"
                            required
                        />

                        <AuthInput
                            id="password"
                            name="password"
                            type="password"
                            label="Password"
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                            hint={isLogin ? undefined : 'At least 6 characters.'}
                            required
                        />

                        {!isLogin && (
                            <AuthInput
                                id="confirm-password"
                                name="confirm-password"
                                type="password"
                                label="Confirm password"
                                autoComplete="new-password"
                                required
                            />
                        )}

                        {error && (
                            <p
                                role="alert"
                                className="border-l-2 border-accent-red py-1 pl-3 text-xs leading-relaxed text-accent-red-dark"
                            >
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="h-11 w-full border border-text-primary bg-text-primary font-mono text-[11px] uppercase tracking-widest text-background transition-colors hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoading
                                ? (isLogin ? 'Signing in…' : 'Creating account…')
                                : (isLogin ? 'Sign in' : 'Create account')}
                        </button>
                    </form>

                    {hasGitHubProvider && (
                        <div className="mt-6 border-t border-border-light pt-5">
                            <button
                                type="button"
                                onClick={() => signIn('github', { callbackUrl: '/' })}
                                className="inline-flex h-9 items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
                            >
                                <IconBrandGithub className="h-3.5 w-3.5" />
                                Continue with GitHub
                            </button>
                        </div>
                    )}

                    {/* Say only what the product actually does. There is no owner
                        role, admin tier, or registration policy behind this form,
                        so it must not imply one — on a self-hosted tool a false
                        security assurance is worse than none. */}
                    <p className="mt-8 font-mono text-[10px] leading-relaxed text-text-muted">
                        Your data stays on the machine you host this on.
                    </p>
                </section>
            </main>
        </div>
    );
}

/** Turn a failed response into something the person can act on. */
function describeStatus(status: number, isLogin: boolean): string {
    if (status === 401 || status === 403) {
        return 'That email/username and password don’t match an account.';
    }
    if (status === 409) {
        return 'An account with those details already exists. Try signing in.';
    }
    if (status === 429) {
        return 'Too many attempts. Wait a moment and try again.';
    }
    if (status >= 500) {
        return 'The server had a problem handling that. Check its logs.';
    }
    return isLogin ? 'Couldn’t sign in.' : 'Couldn’t create the account.';
}

function ModeTab({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={`border-b py-1 transition-colors ${
                active
                    ? 'border-text-primary text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
        >
            {children}
        </button>
    );
}

function AuthInput({
    id,
    name,
    label,
    type = 'text',
    placeholder,
    autoComplete,
    hint,
    required,
    /**
     * Credential fields must not be "helped" by the keyboard: autocapitalising a
     * username or autocorrecting it to a dictionary word silently breaks sign-in
     * on phones, and it is invisible to the person typing.
     */
    isCredential = true,
}: {
    id: string;
    name: string;
    label: string;
    type?: string;
    placeholder?: string;
    autoComplete?: string;
    hint?: string;
    required?: boolean;
    isCredential?: boolean;
}) {
    return (
        <div>
            <label
                htmlFor={id}
                className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary"
            >
                {label}
            </label>
            <input
                id={id}
                name={name}
                type={type}
                required={required}
                placeholder={placeholder}
                autoComplete={autoComplete}
                {...(isCredential
                    ? {
                          autoCorrect: 'off',
                          autoCapitalize: 'off',
                          spellCheck: false,
                      }
                    : {})}
                aria-describedby={hint ? `${id}-hint` : undefined}
                className="mt-1.5 h-10 w-full border-0 border-b border-border-medium bg-transparent px-0 text-sm text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-text-primary"
            />
            {hint && (
                <p id={`${id}-hint`} className="mt-1.5 font-mono text-[10px] text-text-muted">
                    {hint}
                </p>
            )}
        </div>
    );
}
