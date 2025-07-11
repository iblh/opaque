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
        'accent-green-subtle': 'rgba(126, 132, 107, 0.1)',
        'accent-green-hover': 'rgba(126, 132, 107, 0.15)',
        'text-primary': '#32373B',
        'text-secondary': 'rgba(50, 55, 59, 0.8)',
        'text-tertiary': 'rgba(50, 55, 59, 0.6)',
        'text-muted': 'rgba(50, 55, 59, 0.4)',
        background: '#FFFFFF',
        surface: 'rgba(248, 249, 250, 0.8)',
        'surface-elevated': 'rgba(255, 255, 255, 0.95)',
        'border-light': '#E8EAED',
        'border-medium': '#DADCE0',
        'border-strong': '#BDC1C6',
        gray: {
          50: '#F8F9FA',
          100: '#F1F3F4',
          200: '#E8EAED',
          300: '#DADCE0',
          400: '#BDC1C6',
          500: '#9AA0A6',
          600: '#80868B',
          700: '#5F6368',
          800: '#3C4043',
          900: '#202124',
        },
      },
      fontFamily: {
        body: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', "Segoe UI", 'Roboto', "Helvetica Neue", 'Arial', "Noto Sans", 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} 