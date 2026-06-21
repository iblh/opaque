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
      // Solid tokens are `rgb(var(--x) / <alpha-value>)` so Tailwind opacity
      // suffixes (e.g. bg-ink-900/20) compose correctly. Alpha-baked tokens
      // (text-secondary/tertiary/muted, surface, the *-subtle/-hover accents)
      // carry their own opacity and are referenced directly — never used /NN.
      colors: {
        'accent-green': 'rgb(var(--accent-green) / <alpha-value>)',
        'accent-green-light': 'rgb(var(--accent-green-light) / <alpha-value>)',
        'accent-green-dark': 'rgb(var(--accent-green-dark) / <alpha-value>)',
        'accent-green-subtle': 'var(--accent-green-subtle)',
        'accent-green-hover': 'var(--accent-green-hover)',
        'accent-red': 'rgb(var(--accent-red) / <alpha-value>)',
        'accent-red-dark': 'rgb(var(--accent-red-dark) / <alpha-value>)',
        'accent-red-subtle': 'var(--accent-red-subtle)',
        'accent-amber': 'rgb(var(--accent-amber) / <alpha-value>)',
        'accent-amber-dark': 'rgb(var(--accent-amber-dark) / <alpha-value>)',
        'accent-blue': 'rgb(var(--accent-blue) / <alpha-value>)',
        'accent-blue-subtle': 'var(--accent-blue-subtle)',
        'accent-blue-hover': 'var(--accent-blue-hover)',
        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-muted': 'var(--text-muted)',
        'background': 'rgb(var(--background) / <alpha-value>)',
        'surface': 'var(--surface)',
        'surface-elevated': 'rgb(var(--surface-elevated) / <alpha-value>)',
        'surface-sunken': 'rgb(var(--surface-sunken) / <alpha-value>)',
        'border-light': 'rgb(var(--border-light) / <alpha-value>)',
        'border-medium': 'rgb(var(--border-medium) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        'ink': {
          100: 'rgb(var(--ink-100) / <alpha-value>)',
          200: 'rgb(var(--ink-200) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
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
