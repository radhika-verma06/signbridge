/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0A1220',
          900: '#0E1B2E',
          800: '#152A44',
          700: '#1C3654',
          600: '#284873',
        },
        gold: {
          400: '#E4BB5C',
          500: '#D8A536',
          600: '#BE8B22',
          700: '#9C701A',
        },
        paper: {
          DEFAULT: '#F6F5F1',
          dim: '#EFEDE6',
        },
        ink: {
          DEFAULT: '#12192A',
          soft: '#3C4658',
          faint: '#5A6478',
        },
        line: '#E1DED4',
        success: '#2F7A4F',
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(14, 27, 46, 0.06), 0 8px 24px -12px rgba(14, 27, 46, 0.18)',
        raised: '0 2px 4px rgba(14, 27, 46, 0.08), 0 16px 32px -16px rgba(14, 27, 46, 0.22)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(216,165,54,0.45)' },
          '50%': { boxShadow: '0 0 0 6px rgba(216,165,54,0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'slide-down': 'slide-down 0.25s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
