/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'display': ['Libertinus Math', 'system-ui'],
        'body': ['Inter', 'sans-serif'],
        'sans': ['Inter', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#f8fafc',
          100: '#f1f5f9', 
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#1e3a8a',
          600: '#1e40af',
          700: '#1d4ed8',
          800: '#1e3a8a',
          900: '#1e2a5a',
          950: '#0f172a',
        },
        dark: {
          navy: '#0B1426',
          slate: '#1A2332',
        },
        abu: {
          navy: '#1a237e',
          gold: '#FFD700',
          blue: '#4A90E2',
          light: '#F8FAFC',
        },
      },
      animation: {
        'fadeInUp': 'fadeInUp 0.6s ease-out',
        'fadeInLeft': 'fadeInLeft 0.6s ease-out',
        'fadeInRight': 'fadeInRight 0.6s ease-out',
        'slideUp': 'slideUp 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 2s infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'navy': '0 4px 6px -1px rgba(30, 41, 59, 0.1), 0 2px 4px -1px rgba(30, 41, 59, 0.06)',
        'navy-lg': '0 10px 15px -3px rgba(30, 41, 59, 0.1), 0 4px 6px -2px rgba(30, 41, 59, 0.05)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-navy': '0 0 20px rgba(71, 85, 105, 0.3)',
      },
      backgroundImage: {
        'navy-gradient': 'linear-gradient(135deg, #0f172a 0%, #1e2a5a 100%)',
        'light-gradient': 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
      }
    },
  },
  plugins: [],
} 