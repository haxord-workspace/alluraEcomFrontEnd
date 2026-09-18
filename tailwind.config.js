/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          brown: '#561C08',
          cream: '#F7E6C8',
          white: '#FFFFFF',
          black: '#000000',
          neutral: '#F5F5F5',
        },
        allura: {
          bg: '#F7E6C8',
          bgSecondary: '#FFFFFF',
          card: '#FFFFFF',
          text: '#000000',
          muted: '#561C08',
          gold: '#561C08',
          goldDark: '#561C08',
          goldLight: '#F7E6C8',
          border: 'rgba(86, 28, 8, 0.15)',
          softBrown: '#561C08',
          darkBrown: '#561C08',
          announcement: '#561C08',
        }
      },
      fontFamily: {
        sans: ['"Quicksand"', '"Poppins"', 'sans-serif'],
        heading: ['"Quicksand"', 'sans-serif'],
        body: ['"Poppins"', 'sans-serif'],
        malayalam: ['"Anek Malayalam"', '"Poppins"', 'sans-serif'],
        serif: ['"Quicksand"', 'sans-serif'],
        display: ['"Quicksand"', 'sans-serif'],
      },
      borderRadius: {
        'arch': '120px 120px 6px 6px',
        'arch-sm': '80px 80px 4px 4px',
      },
      boxShadow: {
        'subtle': '0 4px 20px -2px rgba(44, 41, 38, 0.05)',
        'luxury': '0 10px 30px -5px rgba(52, 42, 37, 0.08)',
        'drawer': '-4px 0 25px rgba(44, 41, 38, 0.15)',
        'bottom-sheet': '0 -8px 30px rgba(44, 41, 38, 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 3s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.9' },
        }
      }
    },
  },
  plugins: [],
}
