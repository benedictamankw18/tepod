import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Forward API calls to the NKABOM AGRILINK backend during development (same-origin
      // requests, so no CORS is needed on the backend).
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
      // Serve uploaded produce/farm/verification images from the backend in dev.
      '/uploads': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
