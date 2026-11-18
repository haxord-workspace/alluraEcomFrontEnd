import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Backend origin for the dev proxy below (read from VITE_API_BASE_URL)
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  let apiOrigin: string | undefined
  try {
    apiOrigin = env.VITE_API_BASE_URL ? new URL(env.VITE_API_BASE_URL).origin : undefined
  } catch {
    apiOrigin = undefined
  }

  return {
    plugins: [react()],
    // Expose VITE_* vars and the public Meta Pixel ID (only this exact name, so no other META_* value leaks)
    envPrefix: ['VITE_', 'META_PIXEL_ID'],
    // Dev only: lets the app opened from a phone on the LAN reach the API without CORS errors
    // (src/service/api.ts switches to /__api when the page isn't on localhost).
    server: apiOrigin
      ? {
          proxy: {
            '/__api': {
              target: apiOrigin,
              changeOrigin: true,
              secure: false,
              rewrite: path => path.replace(/^\/__api/, ''),
            },
          },
        }
      : undefined,
  }
})
