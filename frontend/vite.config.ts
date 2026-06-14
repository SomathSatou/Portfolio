import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: [
        'src/data/**',
        'src/components/Footer.tsx',
        'src/components/Header.tsx',
        'src/components/Layout.tsx',
        'src/App.tsx',
      ],
      exclude: [
        'src/components/Jdr/**',
        'src/components/Muscu/**',
        'src/components/HubPerso.tsx',
        'src/components/Project/**',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
      reporter: ['text', 'html'],
    },
  },
})
