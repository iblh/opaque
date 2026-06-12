/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'accent-green': '#7E846B',
        'accent-green-light': '#9DA085',
        'accent-green-dark': '#6B7159',
        'accent-green-subtle': 'rgba(126, 132, 107, 0.08)',
        'accent-green-hover': 'rgba(126, 132, 107, 0.15)',
        'accent-red': '#A76767',
        'accent-red-dark': '#8E5555',
        'accent-red-subtle': 'rgba(167, 103, 103, 0.08)',
        'accent-amber': '#B08D57',
        'accent-amber-dark': '#97784A',
        'accent-blue': '#5E6AD2',
        'accent-blue-subtle': 'rgba(94, 106, 210, 0.08)',
        'accent-blue-hover': 'rgba(94, 106, 210, 0.15)',
        'text-primary': '#1A1D1F',
        'text-secondary': 'rgba(26, 29, 31, 0.75)',
        'text-tertiary': 'rgba(26, 29, 31, 0.55)',
        'text-muted': 'rgba(26, 29, 31, 0.4)',
        'background': '#FFFFFF',
        'surface': 'rgba(250, 250, 250, 0.8)',
        'surface-elevated': '#FFFFFF',
        'surface-sunken': '#F7F7F7',
        'border-light': '#EDEDED',
        'border-medium': '#DEDEDE',
        'border-strong': '#D0D0D0',
        'ink': {
          100: '#F7F7F7',
          200: '#E8E8E8',
          300: '#DADADA',
          400: '#B8B8B8',
          500: '#999999',
          600: '#777777',
          700: '#555555',
          800: '#333333',
          900: '#111111',
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
