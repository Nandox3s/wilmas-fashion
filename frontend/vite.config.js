import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function sanitizeAxiosFallbackOrigin() {
  return {
    name: 'sanitize-axios-fallback-origin',
    renderChunk(code) {
      if (!code.includes('http://localhost')) return null
      return { code: code.replaceAll('http://localhost', 'https://invalid.invalid'), map: null }
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'lightsail' ? [sanitizeAxiosFallbackOrigin()] : [])],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:4000',
      '/uploads': 'http://127.0.0.1:4000',
    },
  },
}))
