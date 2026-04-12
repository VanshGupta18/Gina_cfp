import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'marquee': 'marquee 20s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        brand: {
          indigo: '#5A4EE3',
          'indigo-light': '#7267F2',
          cyan: '#3CE0D6',
          purple: '#8C52FF',
          accent: '#A5B4FC',
        },
        surface: {
          DEFAULT: '#0F121A', // Very dark slate/navy
          secondary: '#1A1E27', // Raised elements
          tertiary: '#232833',
          border: '#2A303C', // Subtle borders
        },
      },
      width: {
        sidebar: '280px',
        pinned: '360px',
      },
    },
  },
  plugins: [],
};
export default config;

