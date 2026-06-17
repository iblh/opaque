'use client';

import { useEffect, useState } from 'react';
import {
  IconCheck,
  IconDeviceDesktop,
  IconKeyboard,
  IconLoader2,
  IconMoon,
  IconSettings,
  IconSun,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import {
  SEARCH_PROVIDERS,
  type SearchProviderId,
} from '@/lib/searchProviders';
import {
  applyTheme,
  readThemePreference,
  setThemePreference,
  type ThemePreference,
} from '@/lib/theme';
import { ShortcutsList } from '@/components/shortcuts';

type SettingsTab = 'appearance' | 'preferences' | 'account' | 'shortcuts';

interface SettingsDialogProps {
  displayName: string;
  accountLabel: string;
  searchProviderId: SearchProviderId;
  onSearchProviderChange: (id: SearchProviderId) => void;
  onNameUpdated: (name: string) => void;
  onClose: () => void;
}

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'appearance', label: 'Appearance', icon: <IconSun className="h-3.5 w-3.5" /> },
  { id: 'preferences', label: 'Preferences', icon: <IconSettings className="h-3.5 w-3.5" /> },
  { id: 'account', label: 'Account', icon: <IconUser className="h-3.5 w-3.5" /> },
  { id: 'shortcuts', label: 'Shortcuts', icon: <IconKeyboard className="h-3.5 w-3.5" /> },
];

export default function SettingsDialog({
  displayName,
  accountLabel,
  searchProviderId,
  onSearchProviderChange,
  onNameUpdated,
  onClose,
}: SettingsDialogProps) {
  const [tab, setTab] = useState<SettingsTab>('appearance');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      data-overlay
      onClick={onClose}
      className="fixed inset-0 z-[80] flex animate-fade-in items-center justify-center bg-ink-900/20 p-4"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex h-[26rem] w-full max-w-2xl overflow-hidden rounded-sm border border-border-light bg-surface-elevated shadow-floating"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-sunken hover:text-text-primary"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>

        {/* Tab rail */}
        <div className="flex w-44 flex-shrink-0 flex-col gap-0.5 border-r border-border-light bg-surface-sunken/40 p-3">
          <div className="mb-2 px-2 font-serif text-sm text-text-primary">Settings</div>
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors ${
                tab === item.id
                  ? 'bg-surface-elevated text-text-primary'
                  : 'text-text-secondary hover:bg-surface-sunken hover:text-text-primary'
              }`}
            >
              <span className="text-text-tertiary">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          {tab === 'appearance' && <AppearanceSection />}
          {tab === 'preferences' && (
            <PreferencesSection
              searchProviderId={searchProviderId}
              onSearchProviderChange={onSearchProviderChange}
            />
          )}
          {tab === 'account' && (
            <AccountSection
              displayName={displayName}
              accountLabel={accountLabel}
              onNameUpdated={onNameUpdated}
            />
          )}
          {tab === 'shortcuts' && <ShortcutsSection />}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 font-serif text-sm text-text-primary">{children}</div>;
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <IconSun className="h-4 w-4" /> },
  { value: 'dark', label: 'Dark', icon: <IconMoon className="h-4 w-4" /> },
  { value: 'system', label: 'System', icon: <IconDeviceDesktop className="h-4 w-4" /> },
];

function AppearanceSection() {
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    setPreference(readThemePreference());
  }, []);

  // Live OS-change following for 'system' is handled globally by ThemeWatcher
  // (mounted in the layout), so it works whether or not Settings is open.

  const choose = (value: ThemePreference) => {
    setPreference(value);
    setThemePreference(value);
  };

  return (
    <div>
      <SectionHeading>Appearance</SectionHeading>
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary">Theme</div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => choose(option.value)}
            className={`flex flex-col items-center gap-2 rounded-sm border p-3 text-xs transition-colors ${
              preference === option.value
                ? 'border-accent-green text-text-primary'
                : 'border-border-light text-text-secondary hover:border-border-medium hover:text-text-primary'
            }`}
          >
            <span className={preference === option.value ? 'text-accent-green' : 'text-text-tertiary'}>
              {option.icon}
            </span>
            {option.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-text-tertiary">
        System follows your device&apos;s light or dark setting.
      </p>
    </div>
  );
}

function PreferencesSection({
  searchProviderId,
  onSearchProviderChange,
}: {
  searchProviderId: SearchProviderId;
  onSearchProviderChange: (id: SearchProviderId) => void;
}) {
  return (
    <div>
      <SectionHeading>Preferences</SectionHeading>
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary">Search provider</div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {SEARCH_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => onSearchProviderChange(provider.id)}
            className={`h-7 rounded-sm px-2 text-left text-[11px] transition-colors ${
              searchProviderId === provider.id
                ? 'bg-ink-900 text-background'
                : 'bg-surface-sunken text-text-secondary hover:bg-border-light hover:text-text-primary'
            }`}
          >
            {provider.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-text-tertiary">
        Used by the search box in the header.
      </p>
    </div>
  );
}

function AccountSection({
  displayName,
  accountLabel,
  onNameUpdated,
}: {
  displayName: string;
  accountLabel: string;
  onNameUpdated: (name: string) => void;
}) {
  const [name, setName] = useState(displayName);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');

  const dirty = name.trim() !== displayName.trim();

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || !dirty) return;
    setStatus('saving');
    setError('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Failed to save');
        setStatus('idle');
        return;
      }
      onNameUpdated(result.name);
      setStatus('saved');
      window.setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setError('Network error');
      setStatus('idle');
    }
  };

  return (
    <div>
      <SectionHeading>Account</SectionHeading>

      <label htmlFor="settings-name" className="text-[10px] uppercase tracking-wider text-text-tertiary">
        Display name
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id="settings-name"
          value={name}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void save();
          }}
          className="opaque-input min-w-0 flex-1 focus:border-ink-700"
        />
        <button
          type="button"
          onClick={save}
          disabled={!dirty || status === 'saving'}
          className="opaque-button-primary"
        >
          {status === 'saving' ? (
            <IconLoader2 className="animate-spin" />
          ) : status === 'saved' ? (
            <IconCheck />
          ) : null}
          {status === 'saved' ? 'Saved' : 'Save'}
        </button>
      </div>
      {error && <div className="mt-1.5 text-[11px] text-accent-red-dark">{error}</div>}

      <div className="mt-5 text-[10px] uppercase tracking-wider text-text-tertiary">Account</div>
      <div className="mt-1.5 font-mono text-xs text-text-secondary">{accountLabel}</div>
      <p className="mt-3 text-[11px] leading-relaxed text-text-tertiary">
        Your sign-in identifier can&apos;t be changed here.
      </p>
    </div>
  );
}

function ShortcutsSection() {
  return (
    <div>
      <SectionHeading>Keyboard shortcuts</SectionHeading>
      <ShortcutsList />
    </div>
  );
}
