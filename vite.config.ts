import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Expose VITE_* vars and the public Meta Pixel ID (only this exact name, so no other META_* value leaks)
  envPrefix: ['VITE_', 'META_PIXEL_ID'],
})
