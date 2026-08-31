import type { Config } from 'tailwindcss';

// Design tokens for MedCore HMS — see the design plan for rationale.
// Cool paper background (not the cream/terracotta AI default), ink
// navy for text/nav, muted clinical sage as the primary accent, and
// amber/red as the actual status vocabulary the app needs (pending,
// critical) rather than decoration.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F7F5',
        ink: {
          DEFAULT: '#1A2B33',
          soft: '#465862',
        },
        sage: {
          50: '#EEF4F1',
          100: '#D3E3DB',
          400: '#4C8F79',
          500: '#2F6F5E',
          600: '#255A4C',
          700: '#1C453A',
        },
        amber: {
          50: '#FBF3E3',
          400: '#E3B65C',
          500: '#D9A441',
          600: '#B8862E',
        },
        clay: {
          50: '#FAECEC',
          400: '#C56A6E',
          500: '#B5484D',
          600: '#943A3E',
        },
        line: '#E1E4E1',
      },
      fontFamily: {
        sans: ['var(--font-plex-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        lg: '12px',
      },
      keyframes: {
        'pulse-draw': {
          '0%': { strokeDasharray: '0 400', strokeDashoffset: '0' },
          '60%': { strokeDasharray: '400 400', strokeDashoffset: '0' },
          '100%': { strokeDasharray: '400 400', strokeDashoffset: '-400' },
        },
      },
      animation: {
        'pulse-draw': 'pulse-draw 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
