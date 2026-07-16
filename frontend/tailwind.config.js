/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0f19', // very premium slate-dark bg
        darkCard: '#151c2c', // card background
        accent: {
          blue: '#3b82f6',
          violet: '#8b5cf6',
          emerald: '#10b981',
          indigo: '#6366f1',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
