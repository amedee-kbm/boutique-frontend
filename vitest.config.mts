import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
    env: loadEnv(mode, process.cwd(), ''),
    // DB-backed integration tests (RLS) talk to a remote Supabase instance
    testTimeout: 20000,
    hookTimeout: 30000,
  },
}))
