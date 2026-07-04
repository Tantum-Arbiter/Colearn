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
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#1E3A8A',
          light: '#4ECDC4',
        },
        brand: {
          deepBlue: '#1E3A8A',
          blue: '#3B82F6',
          teal: '#4ECDC4',
          text: '#2E3D4F',
          background: '#FDFAF2',
        },
        night: {
          DEFAULT: '#1E1B4B',
          deep: '#171A3D',
        },
        cream: {
          DEFAULT: '#FDFAF2',
          deep: '#F6F0E2',
        },
        ink: {
          DEFAULT: '#2E3D4F',
          soft: '#5A6B7D',
        },
        star: {
          DEFAULT: '#FFD166',
          deep: '#FFC145',
          soft: '#FFF3D6',
        },
      },
      fontFamily: {
        rounded: ['var(--font-fredoka)', 'Fredoka', 'Nunito', 'system-ui', 'sans-serif'],
        display: ['var(--font-fredoka)', 'Fredoka', 'Nunito', 'system-ui', 'sans-serif'],
        sans: ['var(--font-nunito)', 'Nunito', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 55%, #4ECDC4 100%)',
        'gradient-hero': 'linear-gradient(180deg, #171A3D 0%, #1E3A8A 60%, #2E5FBF 100%)',
        'gradient-night': 'linear-gradient(180deg, #171A3D 0%, #1E1B4B 55%, #1E3A8A 100%)',
        'gradient-sun': 'linear-gradient(135deg, #FFD166 0%, #FFB84D 100%)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      boxShadow: {
        'soft': '0 10px 30px rgba(30, 27, 75, 0.08)',
        'card': '0 18px 44px rgba(30, 27, 75, 0.12)',
        'lift': '0 22px 50px rgba(30, 27, 75, 0.16)',
        'glow': '0 8px 28px rgba(255, 193, 69, 0.4)',
        'glow-blue': '0 0 40px rgba(59, 130, 246, 0.3)',
      },
      animation: {
        'twinkle': 'twinkle 3.5s ease-in-out infinite',
        'float': 'float 5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.25', transform: 'scale(0.9)' },
          '50%': { opacity: '0.9', transform: 'scale(1.1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(var(--float-rotate, 0deg))' },
          '50%': { transform: 'translateY(-12px) rotate(var(--float-rotate, 0deg))' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
