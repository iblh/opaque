/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Tokens resolve to CSS variables (defined in globals.css) so the whole
      // palette flips under .dark without per-component `dark:` variants.
      colors: {
        'accent-green': 'var(--accent-green)',
        'accent-green-light': 'var(--accent-green-light)',
        'accent-green-dark': 'var(--accent-green-dark)',
        'accent-green-subtle': 'var(--accent-green-subtle)',
        'accent-green-hover': 'var(--accent-green-hover)',
        'accent-red': 'var(--accent-red)',
        'accent-red-dark': 'var(--accent-red-dark)',
        'accent-red-subtle': 'var(--accent-red-subtle)',
        'accent-amber': 'var(--accent-amber)',
        'accent-amber-dark': 'var(--accent-amber-dark)',
        'accent-blue': 'var(--accent-blue)',
        'accent-blue-subtle': 'var(--accent-blue-subtle)',
        'accent-blue-hover': 'var(--accent-blue-hover)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-muted': 'var(--text-muted)',
        'background': 'var(--background)',
        'surface': 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        'surface-sunken': 'var(--surface-sunken)',
        'border-light': 'var(--border-light)',
        'border-medium': 'var(--border-medium)',
        'border-strong': 'var(--border-strong)',
        'ink': {
          100: 'var(--ink-100)',
          200: 'var(--ink-200)',
          300: 'var(--ink-300)',
          400: 'var(--ink-400)',
          500: 'var(--ink-500)',
          600: 'var(--ink-600)',
          700: 'var(--ink-700)',
          800: 'var(--ink-800)',
          900: 'var(--ink-900)',
        },
      },
      fontFamily: {
        body: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', "Segoe UI", 'Roboto', "Helvetica Neue", 'Arial', "Noto Sans", 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
        serif: ['var(--font-serif)', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
      },
      borderRadius: {
        'sm': '2px',
        DEFAULT: '4px',
        'md': '6px',
        'lg': '8px',
      },
      boxShadow: {
        'subtle': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'elevated': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'floating': '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
      // The single motion budget (see web/DESIGN_SPEC.md): every `transition-*`
      // without an explicit duration/easing uses these.
      transitionDuration: {
        DEFAULT: '180ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.2, 0.6, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
