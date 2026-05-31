'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProviders, signIn } from 'next-auth/react';
import {
    IconArrowRight,
    IconBrandGithub,
    IconRefresh,
} from '@tabler/icons-react';

const COMMANDS = [
    'sync bookmarks://ops-cluster',
    'open vault://homelab/identity',
    'tail metrics --server app-srv-a1',
    'index applications --scope secure',
    'rotate agent token --node cache-01',
];

const BOOKMARKS = [
    'docs.internal/runbooks',
    'grafana.local/dashboards',
    'github.com/opaque/infra',
    'papertrail://deploy-log',
    'vault.local/credentials',
    'uptime.lab/status',
];

const ROTOR_STEPS = 8;

type ServerRow = {
    id: string;
    uptime: number;
    cpu: string[];
    memory: string[];
};

function buildRotor(base: number, amplitude: number, phase: number, decimals = 0) {
    return Array.from({ length: ROTOR_STEPS }, (_, step) => {
        const value = base + amplitude * (Math.sin((step + phase) / 1.7) + 1) / 2;
        return decimals === 0 ? String(Math.round(value)).padStart(2, '0') : value.toFixed(decimals);
    });
}

const SERVER_ROWS: ServerRow[] = [
    { id: 'PROXY_01',   uptime: 47,  cpu: buildRotor(7, 38, 0), memory: buildRotor(12.2, 2.4, 0, 1) },
    { id: 'DB_MASTER',  uptime: 51,  cpu: buildRotor(9, 62, 1), memory: buildRotor(65.2, 2.4, 1, 1) },
    { id: 'APP_SRV_A1', uptime: 41,  cpu: buildRotor(7, 38, 2), memory: buildRotor(9.8,  2.4, 2, 1) },
    { id: 'CACHE_01',   uptime: 107, cpu: buildRotor(7, 38, 3), memory: buildRotor(33.8, 2.4, 3, 1) },
];

const PENDING_ARCHIVE = buildRotor(42, 6, 0);
const LAST_SYNC = buildRotor(2, 3, 0);

export default function LoginPage() {
    const [error, setError] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [hasGitHubProvider, setHasGitHubProvider] = useState(false);
    const router = useRouter();

    useEffect(() => {
        getProviders()
            .then((providers) => setHasGitHubProvider(Boolean(providers?.github)))
            .catch(() => setHasGitHubProvider(false));
    }, []);

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
            setError('Email or username and password are required');
            setIsLoading(false);
            return;
        }

        if (!isLogin) {
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                setIsLoading(false);
                return;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters');
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
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const result = await res.json();

            if (res.status === 200 || res.status === 201) {
                router.push('/');
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="login-shell relative min-h-screen overflow-hidden bg-[#f8f8f7] text-ink-950">
            <div className="login-mesh" aria-hidden="true" />

            <div className="login-bg" aria-hidden="true">
                <div className="login-telemetry login-telemetry-primary">
                    <div>--- HOMELAB CLUSTER TELEMETRY ---</div>
                    <div>SYS_TIME: 2026-05-31T00:05:46.586Z</div>
                    {SERVER_ROWS.map((server) => (
                        <div key={server.id}>
                            <span>[{server.id}]</span>
                            <span> CPU: </span>
                            <Rotor values={server.cpu} suffix="%" minWidth="2ch" />
                            <span> MEM: </span>
                            <Rotor values={server.memory} suffix="GB" minWidth="4ch" />
                            <span> UP: {server.uptime}d</span>
                        </div>
                    ))}
                    <div className="login-typing">
                        <span>&gt; </span>
                        <span className="login-cmd-track">
                            {COMMANDS.map((cmd) => (
                                <span key={cmd} className="login-cmd">{cmd}</span>
                            ))}
                        </span>
                        <span className="login-caret">_</span>
                    </div>
                </div>

                <div className="login-bookmark-field">
                    {BOOKMARKS.map((bm) => (
                        <div key={bm} className="login-bookmark">bookmark::{bm}</div>
                    ))}
                </div>

                <div className="login-telemetry login-telemetry-secondary">
                    <div>--- INDEXER STATUS ---</div>
                    <div>TOTAL_BOOKMARKS: 14,239</div>
                    <div>
                        <span>PENDING_ARCHIVE: </span>
                        <Rotor values={PENDING_ARCHIVE} minWidth="2ch" />
                    </div>
                    <div>
                        <span>LAST_SYNC: </span>
                        <Rotor values={LAST_SYNC} suffix="m ago" minWidth="2ch" />
                    </div>
                    <div className="mt-4">Waiting for authorization state...</div>
                </div>
            </div>

            <div className="login-glass" aria-hidden="true" />

            <main className="relative z-20 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
                <section className="w-full max-w-[26rem]">
                    <div className="mb-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-[5px] bg-black font-mono text-xs font-semibold text-white">
                                OP
                            </div>
                            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5f6b84]">
                                OPAQUE
                            </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => { setIsLogin(true); setError(''); }}
                                className={`pb-0.5 transition-colors ${isLogin ? 'border-b-2 border-black text-black' : 'border-b-2 border-transparent text-[#8792aa] hover:text-black'}`}
                            >
                                Login
                            </button>
                            <span className="text-[#a5adbd]">/</span>
                            <button
                                type="button"
                                onClick={() => { setIsLogin(false); setError(''); }}
                                className={`pb-0.5 transition-colors ${!isLogin ? 'border-b-2 border-black text-black' : 'border-b-2 border-transparent text-[#8792aa] hover:text-black'}`}
                            >
                                Register
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} autoComplete="off" className="space-y-7">
                        {!isLogin && (
                            <AuthInput
                                id="name"
                                name="name"
                                label="Operator name"
                                placeholder="ada lovelace"
                            />
                        )}

                        <AuthInput
                            id="identifier"
                            name="identifier"
                            label="Email or username"
                            placeholder="operator@domain.com"
                            required
                        />

                        <AuthInput
                            id="password"
                            name="password"
                            type="password"
                            label="Password"
                            placeholder="••••••••"
                            required
                        />

                        {!isLogin && (
                            <AuthInput
                                id="confirm-password"
                                name="confirm-password"
                                type="password"
                                label="Confirm password"
                                placeholder="••••••••"
                                required
                            />
                        )}

                        {error && (
                            <div className="border-l-2 border-black px-3 py-2 font-mono text-xs text-black">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex h-11 w-full items-center justify-center gap-3 bg-black px-6 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#202020] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <IconRefresh className="h-4 w-4 animate-spin" />
                                    {isLogin ? 'Signing in' : 'Creating'}
                                </>
                            ) : (
                                <>
                                    {isLogin ? 'Authenticate' : 'Create account'}
                                    <IconArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px]">
                        <button
                            type="button"
                            className="text-[#69758f] transition-colors hover:text-black"
                        >
                            Forgot password?
                        </button>
                        {hasGitHubProvider && (
                            <button
                                type="button"
                                onClick={() => signIn('github', { callbackUrl: '/' })}
                                className="inline-flex items-center gap-1.5 text-[#63708b] transition-colors hover:text-black"
                            >
                                <IconBrandGithub className="h-3.5 w-3.5" />
                                GitHub
                            </button>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

function Rotor({
    values,
    suffix = '',
    minWidth,
}: {
    values: string[];
    suffix?: string;
    minWidth: string;
}) {
    return (
        <span className="stat-rotor" style={{ minWidth }}>
            {values.map((value, index) => (
                <span key={index}>{value}{suffix}</span>
            ))}
        </span>
    );
}

function AuthInput({
    id,
    name,
    label,
    placeholder,
    type = 'text',
    required = false,
    autoComplete = 'off',
}: {
    id: string;
    name: string;
    label: string;
    placeholder: string;
    type?: string;
    required?: boolean;
    autoComplete?: string;
}) {
    return (
        <label htmlFor={id} className="block">
            <span className="block font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#68748d]">
                {label}
            </span>
            <input
                type={type}
                id={id}
                name={name}
                placeholder={placeholder}
                required={required}
                autoComplete={autoComplete}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
                className="mt-2 w-full border-0 border-b border-black/25 bg-transparent px-0 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-[#8c98b0] focus:border-black focus:ring-0"
            />
        </label>
    );
}
