/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        allura: {
          bg: '#F7F1E7',
          bgSecondary: '#EFE5D5',
          card: '#FCFAF6',
          text: '#2C2926',
          muted: '#746A60',
          gold: '#A77B43',
          goldDark: '#8B6335',
          goldLight: '#C99E66',
          border: '#DED2C1',
          softBrown: '#665246',
          darkBrown: '#342A25',
          announcement: '#9B7040',
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'],
        display: ['"Playfair Display"', 'serif'],
        sans: ['"Manrope"', 'sans-serif'],
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
