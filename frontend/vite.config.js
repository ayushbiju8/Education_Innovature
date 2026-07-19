import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Bake the production backend URL into the bundle at build time.
    // This is necessary because .env files are gitignored and Vercel won't
    // have VITE_API_URL set unless it's specified in the Vercel dashboard.
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 'https://innovature-backend.onrender.com'
    ),
  },
})
