import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const REQUIRED_PROD_VARS = [
  'VITE_WORKER_URL',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_RECAPTCHA_SITE_KEY',
]

export default defineConfig(({ mode }) => {
  if (mode === 'production') {
    const missing = REQUIRED_PROD_VARS.filter(k => !process.env[k])
    if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }
  return {
    plugins: [react(), tailwindcss()],
    base: '/Aimprint/',
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
        '/ingest': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
  }
})
