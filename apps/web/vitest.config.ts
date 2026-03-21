import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom emulates browser APIs (document, window, localStorage) in Node.js
    environment: 'jsdom',
    // Makes describe/it/expect available globally — no need to import in every file
    globals: true,
    // Runs before each test file — sets up jest-dom matchers and MSW server
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Exclude generated/vendor code from coverage reports
      exclude: [
        'node_modules/',
        'src/components/ui/', // Shadcn — not our code
        '.next/',
        'src/test-utils/',
        '**/*.config.{ts,js}',
      ],
    },
  },
  resolve: {
    alias: {
      // Must match tsconfig.json paths so imports like @/store work in tests
      '@': resolve(__dirname, './src'),
    },
  },
})
