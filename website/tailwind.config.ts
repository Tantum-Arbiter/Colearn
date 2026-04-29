import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Grow with Freya brand colors
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#1E3A8A',
          light: '#4ECDC4',
        },
        brand: {
          deepBlue: '#1E3A8A',
          blue: '#3B82F6',
          teal: '#4ECDC4',
          text: '#11181C',
          background: '#ffffff',
        },
      },
      fontFamily: {
        rounded: [
          'SF Pro Rounded',
          'Hiragino Maru Gothic ProN',
          'Meiryo',
          'MS PGothic',
          'system-ui',
          'sans-serif',
        ],
        sans: [
          'SF Pro Display',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 50%, #4ECDC4 100%)',
        'gradient-hero': 'linear-gradient(180deg, #1E3A8A 0%, #3B82F6 100%)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'card': '0 8px 30px rgba(0, 0, 0, 0.12)',
        'glow': '0 0 40px rgba(59, 130, 246, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;

