import {
  LAYOUTS,
  isDensityId,
  isLayoutId,
  type DensityId,
  type LayoutId,
} from '@/lib/layouts';

export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * The full appearance preference set. Theme (colour mode), layout (which preset
 * page skeleton) and density (spacing scale) are independent axes — any layout
 * renders in either colour mode.
 */
export interface AppearancePreference {
  theme: ThemePreference;
  layout: LayoutId;
  density: DensityId;
}

export const THEME_STORAGE_KEY = 'opaque:theme';
export const APPEARANCE_STORAGE_KEY = 'opaque:appearance';

export const DEFAULT_APPEARANCE: AppearancePreference = {
  theme: 'system',
  layout: 'sheet',
  density: 'normal',
};

// Inlined into <head> (see layout.tsx) and run before first paint so the correct
// palette, layout and density are applied with no flash. Kept dependency-free
// and stringified — must stay valid standalone JS. Reads the new appearance
// object, falling back to the legacy theme-only key so existing users keep their
// colour mode on first load after upgrade.
export const THEME_INIT_SCRIPT = `(function(){try{
var d=document.documentElement;
var raw=localStorage.getItem('${APPEARANCE_STORAGE_KEY}');
var a=null;
if(raw){try{a=JSON.parse(raw);}catch(e){}}
var legacy=localStorage.getItem('${THEME_STORAGE_KEY}');
var theme=(a&&a.theme)||legacy||'system';
var layout=(a&&a.layout)||'sheet';
var density=(a&&a.density)||'normal';
var sys=window.matchMedia('(prefers-color-scheme: dark)').matches;
var dark=theme==='dark'||((theme==='system'||!theme)&&sys);
d.classList.toggle('dark',dark);
d.setAttribute('data-theme',dark?'dark':'light');
d.setAttribute('data-layout',layout);
d.setAttribute('data-density',density);
}catch(e){}})();`;

function readStoredAppearance(): AppearancePreference {
  const next: AppearancePreference = { ...DEFAULT_APPEARANCE };

  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppearancePreference>;
      if (parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system') {
        next.theme = parsed.theme;
      }
      if (isLayoutId(parsed.layout)) next.layout = parsed.layout;
      if (isDensityId(parsed.density)) next.density = parsed.density;
      return next;
    }

    // Migration: an older build stored only the colour mode as a bare string.
    const legacy = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (legacy === 'light' || legacy === 'dark' || legacy === 'system') {
      next.theme = legacy;
    }
  } catch {
    // Storage unavailable.
  }

  return next;
}

export function readAppearance(): AppearancePreference {
  if (typeof window === 'undefined') return { ...DEFAULT_APPEARANCE };
  return readStoredAppearance();
}

/** Back-compat helper for callers that only care about the colour mode. */
export function readThemePreference(): ThemePreference {
  return readAppearance().theme;
}

function prefersDark(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveThemeMode(preference: ThemePreference): 'light' | 'dark' {
  return preference === 'dark' || (preference === 'system' && prefersDark()) ? 'dark' : 'light';
}

/** Reflect the whole preference set onto <html>. */
export function applyAppearance(preference: AppearancePreference): void {
  if (typeof document === 'undefined') return;
  const mode = resolveThemeMode(preference.theme);
  const root = document.documentElement;
  // `.dark` stays for Tailwind's darkMode:'class'; data-theme mirrors it so CSS
  // can key off either.
  root.classList.toggle('dark', mode === 'dark');
  root.setAttribute('data-theme', mode);
  root.setAttribute('data-layout', preference.layout);
  root.setAttribute('data-density', preference.density);
}

/** Back-compat helper: apply just the colour mode, keeping layout/density. */
export function applyTheme(preference: ThemePreference): void {
  applyAppearance({ ...readAppearance(), theme: preference });
}

export function setAppearance(patch: Partial<AppearancePreference>): AppearancePreference {
  const next: AppearancePreference = { ...readAppearance(), ...patch };

  // Picking a layout adopts that layout's intended colour mode and density,
  // unless the caller set them explicitly in the same change.
  if (patch.layout && !patch.theme) next.theme = LAYOUTS[patch.layout].defaultTheme;
  if (patch.layout && !patch.density) next.density = LAYOUTS[patch.layout].defaultDensity;

  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next));
    // Keep the legacy key in sync so a downgrade still finds a colour mode.
    window.localStorage.setItem(THEME_STORAGE_KEY, next.theme);
  } catch {
    // Storage unavailable; applies for this session only.
  }

  applyAppearance(next);
  // Let the dashboard re-render into a new skeleton without a reload. (A plain
  // CustomEvent keeps this dependency-free — no store/context needed.)
  try {
    window.dispatchEvent(new CustomEvent('opaque:appearance-change', { detail: next }));
  } catch {
    // Non-browser environment; nothing to notify.
  }
  return next;
}

export function setThemePreference(preference: ThemePreference): void {
  setAppearance({ theme: preference });
}
