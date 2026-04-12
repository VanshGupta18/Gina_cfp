import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // NatWest-appropriate palette
        brand: {
          teal: '#006D6F',
          'teal-light': '#008E90',
          navy: '#1D2B53',
          'navy-light': '#2A3F7A',
          amber: '#F5A623',
          'amber-light': '#F7BC5A',
        },
        surface: {
          DEFAULT: '#0F1623',
          secondary: '#1A2235',
          tertiary: '#232F47',
          border: '#2E3D5A',
        },
      },
      width: {
        sidebar: '260px',
        pinned: '360px',
      },
    },
  },
  plugins: [],
};
export default config;

