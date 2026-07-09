import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Vitest imports modules directly and applies none of Next's runtime contracts:
// no "use server" enforcement, no RSC serialization, no client/server boundary.
// A green suite here is not evidence the app boots. See CLAUDE.md — every
// mutation still needs one unmocked path through the real runtime.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/shared/lib/**', 'src/lib/**'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
