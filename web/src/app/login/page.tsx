'use client';

import { useEffect, useMemo, useState } from 'react';
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

type BookmarkGroup = {
    label: string;
    pool: string[];
};

const BOOKMARK_GROUPS: BookmarkGroup[] = [
    {
        label: 'Bookmarks',
        pool: [
            'docs.internal/runbooks',
            'grafana.local/dashboards',
            'github.com/opaque/infra',
            'papertrail://deploy-log',
            'vault.local/credentials',
            'uptime.lab/status',
            'wiki.lab/incidents',
            'pgadmin.lab/queries',
            'mail.lab/inbox',
            'pkg.lab/registry',
        ],
    },
    {
        label: 'Applications',
        pool: [
            'plex.lab.home/library',
            'jellyfin.lab/transcode',
            'immich.lab/timeline',
            'home-assistant.lab',
            'portainer.lab/stacks',
            'paperless.lab/inbox',
            'nextcloud.lab/files',
            'audiobookshelf.lab',
            'navidrome.lab/stream',
            'ntfy.lab/alerts',
        ],
    },
    {
        label: 'Index',
        pool: [
            'mirror://debian/bookworm',
            'mirror://arch/extra',
            'feed://rss.lab/digest',
            'feed://hn.firehose/top',
            'tag://homelab/playbook',
            'tag://incident/2026-q2',
            'tag://backup/weekly',
            'tag://network/vlan-3',
            'feed://reddit/selfhosted',
            'mirror://alpine/edge',
        ],
    },
];

type BootLine = { id: number; level: 'ok' | 'warn' | 'info' | 'evt'; ts?: string; text: string };

const BOOT_SEQUENCE: Omit<BootLine, 'id'>[] = [
    { level: 'ok',   text: 'systemd module loaded' },
    { level: 'ok',   text: 'mounting /dev/sda1 → /' },
    { level: 'ok',   text: 'network bridge up (eth0, 1Gb)' },
    { level: 'warn', text: 'cgroup memory.swap accounting disabled' },
    { level: 'ok',   text: 'starting opaque-agent.service' },
    { level: 'ok',   text: 'tls cert valid — 84d remaining' },
    { level: 'ok',   text: 'discovered 4 nodes via mdns' },
    { level: 'ok',   text: 'opening sessions on :443' },
    { level: 'info', text: 'waiting for operator authorization' },
];

const RUNTIME_EVENTS: Omit<BootLine, 'id' | 'ts'>[] = [
    { level: 'evt',  text: 'agent app-srv-a1 → heartbeat 200 OK (12ms)' },
    { level: 'evt',  text: 'agent db-master  → heartbeat 200 OK (8ms)' },
    { level: 'evt',  text: 'agent cache-01   → heartbeat 200 OK (4ms)' },
    { level: 'evt',  text: 'agent proxy-01   → heartbeat 200 OK (9ms)' },
    { level: 'ok',   text: 'metrics flush · 1,284 samples committed' },
    { level: 'ok',   text: 'bookmark index rebuilt (14,239 docs · 312ms)' },
    { level: 'info', text: 'rotated agent token cache-01 (expires 30d)' },
    { level: 'ok',   text: 'snapshot zfs/pool0@daily-2026-05-30' },
    { level: 'warn', text: 'db-master · slow query 412ms — analyze pending' },
    { level: 'ok',   text: 'cleanup retained logs older than 7d (free 2.1GB)' },
    { level: 'info', text: 'mdns refresh · 4 nodes online · 0 down' },
    { level: 'evt',  text: 'http GET /api/dashboard 200 · 28ms · op@lab' },
    { level: 'evt',  text: 'http GET /api/server/metrics 200 · 11ms' },
    { level: 'ok',   text: 'tls handshake complete · TLS_AES_256_GCM_SHA384' },
    { level: 'warn', text: 'app-srv-a1 cpu spike 84% (sustained 14s)' },
    { level: 'info', text: 'gc cycle complete · 142ms · reclaimed 38MB' },
    { level: 'ok',   text: 'backup volume sync · 412MB → s3://opaque/lab/' },
    { level: 'info', text: 'mesh peer link cache-01 ↔ db-master · 1ms RTT' },
    { level: 'evt',  text: 'http POST /api/server/metrics 200 · 6ms · agent' },
    { level: 'ok',   text: 'cron job archive_old_metrics · success · 81ms' },
];

const MAX_BOOT_LINES = 9;

const SERVER_ROWS = [
    { id: 'PROXY_01',   uptime: 47,  cpuBase: 7, cpuAmp: 38, memoryBase: 12.2 },
    { id: 'DB_MASTER',  uptime: 51,  cpuBase: 9, cpuAmp: 62, memoryBase: 65.2 },
    { id: 'APP_SRV_A1', uptime: 41,  cpuBase: 7, cpuAmp: 38, memoryBase: 9.8 },
    { id: 'CACHE_01',   uptime: 107, cpuBase: 7, cpuAmp: 38, memoryBase: 33.8 },
];

const DONUTS = [
    { label: 'INGRESS', base: 42, amp: 28, color: '#22c55e' },
    { label: 'EGRESS',  base: 34, amp: 36, color: '#3b82f6' },
    { label: 'CACHE',   base: 68, amp: 22, color: '#a855f7' },
];

// Seeded PRNG so SSR and first client render agree, then real Math.random takes over.
function mulberry32(seed: number) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type GroupState = {
    rows: { id: number; text: string }[];
};

function initialGroupStates(): GroupState[] {
    const rand = mulberry32(1);
    let nextId = 1;
    return BOOKMARK_GROUPS.map((group) => {
        const count = 3 + Math.floor(rand() * 4); // 3..6
        const used = new Set<number>();
        const rows = Array.from({ length: count }, () => {
            let idx = Math.floor(rand() * group.pool.length);
            while (used.has(idx) && used.size < group.pool.length) {
                idx = (idx + 1) % group.pool.length;
            }
            used.add(idx);
            return { id: nextId++, text: group.pool[idx] };
        });
        return { rows };
    });
}

function rotateGroupState(prev: GroupState, group: BookmarkGroup, nextId: () => number): GroupState {
    let rows = prev.rows;
    // 18% chance to change row count
    if (Math.random() < 0.18) {
        const targetCount = 3 + Math.floor(Math.random() * 4);
        if (targetCount > rows.length) {
            const used = new Set(rows.map((r) => r.text));
            const additions: GroupState['rows'] = [];
            for (let i = rows.length; i < targetCount; i += 1) {
                const candidates = group.pool.filter((p) => !used.has(p));
                if (candidates.length === 0) break;
                const pick = candidates[Math.floor(Math.random() * candidates.length)];
                used.add(pick);
                additions.push({ id: nextId(), text: pick });
            }
            rows = [...rows, ...additions];
        } else if (targetCount < rows.length) {
            rows = rows.slice(0, targetCount);
        }
    }
    // Each row: 22% chance to re-pick (forces typing replay via new id)
    rows = rows.map((row) => {
        if (Math.random() > 0.22) return row;
        const used = new Set(rows.map((r) => r.text));
        used.delete(row.text);
        const candidates = group.pool.filter((p) => !used.has(p));
        if (candidates.length === 0) return row;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        return { id: nextId(), text: pick };
    });
    return { rows };
}

export default function LoginPage() {
    const [error, setError] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [hasGitHubProvider, setHasGitHubProvider] = useState(false);
    const [typedCommand, setTypedCommand] = useState('');
    const [commandIndex, setCommandIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [statsTick, setStatsTick] = useState(0);
    const [bootLines, setBootLines] = useState<BootLine[]>([]);
    const [groupStates, setGroupStates] = useState<GroupState[]>(initialGroupStates);
    const router = useRouter();

    useEffect(() => {
        getProviders()
            .then((providers) => setHasGitHubProvider(Boolean(providers?.github)))
            .catch(() => setHasGitHubProvider(false));
    }, []);

    useEffect(() => {
        const command = COMMANDS[commandIndex % COMMANDS.length];
        const complete = typedCommand === command;
        const empty = typedCommand.length === 0;
        const delay = complete && !isDeleting ? 900 : isDeleting ? 34 : 58;

        const timeoutId = window.setTimeout(() => {
            if (complete && !isDeleting) {
                setIsDeleting(true);
                return;
            }
            if (empty && isDeleting) {
                setIsDeleting(false);
                setCommandIndex((value) => (value + 1) % COMMANDS.length);
                return;
            }
            setTypedCommand((current) => (
                isDeleting ? current.slice(0, -1) : command.slice(0, current.length + 1)
            ));
        }, delay);

        return () => window.clearTimeout(timeoutId);
    }, [commandIndex, isDeleting, typedCommand]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setStatsTick((value) => value + 1);
        }, 1450);
        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        let nextId = 1;
        let bootIndex = 0;
        let cancelled = false;
        let timeoutId: number | undefined;

        const formatTs = () => {
            const d = new Date();
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        };

        const pickEvent = (recent: BootLine[]): BootLine => {
            const recentTexts = new Set(recent.slice(-3).map((l) => l.text));
            const candidates = RUNTIME_EVENTS.filter((e) => !recentTexts.has(e.text));
            const pool = candidates.length > 0 ? candidates : RUNTIME_EVENTS;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            return { ...pick, id: nextId++, ts: formatTs() };
        };

        const tick = () => {
            if (cancelled) return;
            setBootLines((prev) => {
                let next = prev;
                if (bootIndex < BOOT_SEQUENCE.length) {
                    next = [...prev, { ...BOOT_SEQUENCE[bootIndex], id: nextId++ }];
                    bootIndex += 1;
                } else {
                    next = [...prev, pickEvent(prev)];
                }
                if (next.length > MAX_BOOT_LINES) {
                    next = next.slice(next.length - MAX_BOOT_LINES);
                }
                return next;
            });
            const isBoot = bootIndex < BOOT_SEQUENCE.length;
            const delay = isBoot
                ? 320 + Math.random() * 160                // 320–480ms during boot
                : 1600 + Math.random() * 1400;            // 1.6–3.0s for runtime events
            timeoutId = window.setTimeout(tick, delay);
        };

        timeoutId = window.setTimeout(tick, 220);
        return () => {
            cancelled = true;
            if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        let nextId = 10_000;
        const intervalId = window.setInterval(() => {
            setGroupStates((prev) => prev.map((state, idx) => (
                rotateGroupState(state, BOOKMARK_GROUPS[idx], () => nextId++)
            )));
        }, 4200);
        return () => window.clearInterval(intervalId);
    }, []);

    const serverRows = useMemo(() => (
        SERVER_ROWS.map((server, index) => {
            const wave = (Math.sin((statsTick + index) / 1.45) + 1) / 2;
            return {
                id: server.id,
                uptime: server.uptime,
                cpu: Math.round(server.cpuBase + wave * server.cpuAmp).toString().padStart(2, '0'),
                memory: (server.memoryBase + wave * 2.8).toFixed(1),
            };
        })
    ), [statsTick]);

    const donutValues = useMemo(() => (
        DONUTS.map((d, index) => {
            const wave = (Math.sin((statsTick + index * 1.7) / 1.8) + 1) / 2;
            return Math.round(d.base + wave * d.amp);
        })
    ), [statsTick]);

    const pendingArchive = 42 + (statsTick % 8);
    const lastSync = 2 + (statsTick % 4);

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
                headers: { 'Content-Type': 'application/json' },
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
                {/* === Section 1: Boot terminal === */}
                <div className="login-boot">
                    <div className="login-boot-head">
                        <span className="login-pulse" />
                        <span>OPAQUE_BOOT</span>
                        <span className="login-telemetry-rule" />
                        <span>kernel 6.8.0-lab · build 2.0.4</span>
                    </div>
                    <div className="login-boot-body">
                        {bootLines.map((line) => (
                            <div key={line.id} className="login-boot-line">
                                {line.ts && (
                                    <span className="login-boot-ts">{line.ts}</span>
                                )}
                                <span className={`login-boot-tag login-boot-tag-${line.level}`}>
                                    [{line.level === 'ok' ? ' OK ' : line.level === 'warn' ? 'WARN' : line.level === 'info' ? 'INFO' : ' EV '}]
                                </span>
                                <span className="login-boot-text">{line.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* === Section 2: 3 bookmark groups === */}
                <div className="login-groups">
                    {BOOKMARK_GROUPS.map((group, groupIndex) => {
                        const state = groupStates[groupIndex];
                        return (
                            <div key={group.label} className="login-group">
                                <div className="login-group-head">
                                    <span className="login-group-label">{group.label}</span>
                                    <span className="login-group-rule" />
                                    <span className="login-group-count">{String(state.rows.length).padStart(2, '0')}</span>
                                </div>
                                <div className="login-group-body">
                                    {state.rows.map((row, rowIndex) => (
                                        <div key={row.id} className="login-bookmark-row">
                                            <span className="login-bookmark-index">{String(rowIndex + 1).padStart(2, '0')}</span>
                                            <span className="login-bookmark-track">
                                                <span
                                                    className="login-bookmark-text"
                                                    style={{ ['--bm-len' as string]: row.text.length }}
                                                >
                                                    {row.text}
                                                </span>
                                                <span className="login-bookmark-caret" />
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* === Section 3: Server stats + donuts === */}
                <div className="login-telemetry login-telemetry-bottom">
                    <div className="login-telemetry-main">
                        <div className="login-telemetry-head">
                            <span className="login-pulse" />
                            <span>CLUSTER TELEMETRY</span>
                            <span className="login-telemetry-rule" />
                            <span>SYS 00:05:46.586Z</span>
                        </div>
                        <div className="login-telemetry-grid">
                            {serverRows.map((server) => (
                                <div key={server.id} className="login-telemetry-row">
                                    <span className="login-telemetry-id">[{server.id}]</span>
                                    <span className="login-telemetry-pair">
                                        <span className="login-telemetry-key">CPU</span>
                                        <span className="login-live-value">{server.cpu}%</span>
                                    </span>
                                    <span className="login-telemetry-pair">
                                        <span className="login-telemetry-key">MEM</span>
                                        <span className="login-live-value min-w-[5ch]">{server.memory}GB</span>
                                    </span>
                                    <span className="login-telemetry-pair">
                                        <span className="login-telemetry-key">UP</span>
                                        <span className="login-telemetry-value">{server.uptime}d</span>
                                    </span>
                                    <span className="login-telemetry-bar">
                                        <span
                                            className="login-telemetry-bar-fill"
                                            style={{ width: `${Math.min(100, Number(server.cpu))}%` }}
                                        />
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="login-telemetry-foot">
                            <span className="login-telemetry-key">PEND_ARCHIVE</span>
                            <span className="login-live-value">{pendingArchive}</span>
                            <span className="login-telemetry-rule" />
                            <span className="login-telemetry-key">LAST_SYNC</span>
                            <span className="login-live-value">{lastSync}m</span>
                            <span className="login-telemetry-rule" />
                            <span className="login-telemetry-prompt">&gt;</span>
                            <span className="login-cmd-track">{typedCommand}</span>
                            <span className="login-caret">_</span>
                        </div>
                    </div>
                    <div className="login-donuts">
                        {DONUTS.map((donut, index) => (
                            <Donut
                                key={donut.label}
                                label={donut.label}
                                value={donutValues[index]}
                                color={donut.color}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="login-glass" aria-hidden="true" />

            <main className="relative z-20 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
                <section className="login-auth-panel w-full max-w-[26rem]">
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

                    <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
                        {!isLogin && (
                            <AuthInput
                                id="name"
                                name="name"
                                label="Your name"
                                placeholder="Ada Lovelace"
                            />
                        )}

                        <AuthInput
                            id="identifier"
                            name="identifier"
                            label="Email or username"
                            placeholder="you@example.com"
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
                            <div className="border-l-2 border-black px-3 py-2 text-xs text-black">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 bg-black px-6 text-sm font-medium text-white transition-colors hover:bg-[#202020] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <IconRefresh className="h-4 w-4 animate-spin" />
                                    {isLogin ? 'Signing in…' : 'Creating account…'}
                                </>
                            ) : (
                                <>
                                    {isLogin ? 'Sign in' : 'Create account'}
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

function Donut({ label, value, color }: { label: string; value: number; color: string }) {
    const size = 56;
    const stroke = 5;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100);

    return (
        <div className="login-donut">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(20, 28, 52, 0.12)"
                    strokeWidth={stroke}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 360ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                />
                <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fontSize="13"
                    fontWeight="600"
                    fill="rgba(15, 22, 44, 1)"
                >
                    {value}
                </text>
            </svg>
            <div className="login-donut-label">{label}</div>
        </div>
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
            <span className="block text-xs font-medium text-[#5f6b84]">
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
                className="mt-1.5 w-full border-0 border-b border-black/25 bg-transparent px-0 py-2 text-sm text-black outline-none transition-colors placeholder:text-[#a5acbd] focus:border-black focus:ring-0"
            />
        </label>
    );
}
