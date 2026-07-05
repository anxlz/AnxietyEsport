import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#8943F9',
          hover: '#7C3AED',
        },
        surface: {
          DEFAULT: '#09090B',
          card: '#111114',
          elevated: '#161619',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
        input: '8px',
        badge: '6px',
      },
    },
  },
  plugins: [],
};

export default config;
