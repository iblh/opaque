export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'opaque:theme';

// Inlined into <head> (see layout.tsx) and run before first paint so the
// correct palette is applied with no flash. Kept dependency-free and stringified
// — must stay valid standalone JS. Exported as a constant so the logic lives in
// one place even though it executes as a string.
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var sys=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=p==='dark'||((p==='system'||!p)&&sys);document.documentElement.classList.toggle('dark',dark);}catch(e){}})();`;

export function readThemePreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    // Storage unavailable.
  }
  return 'system';
}

function prefersDark(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Resolve a preference to the concrete mode and toggle the <html> class.
export function applyTheme(preference: ThemePreference): void {
  if (typeof document === 'undefined') return;
  const dark = preference === 'dark' || (preference === 'system' && prefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage unavailable; applies for this session only.
  }
  applyTheme(preference);
}
