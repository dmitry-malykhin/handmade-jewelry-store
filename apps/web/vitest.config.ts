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
    // `allure-vitest/setup` ships the allure-vitest runtime — must come
    // first so `await allure.suite(...)` resolves inside every beforeAll /
    // beforeEach in the project.
    setupFiles: ['allure-vitest/setup', './vitest.setup.ts'],
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    // CI reads junit.xml via dorny/test-reporter for per-PR test results.
    // Allure additionally writes allure-results/ — consumed by the gh-pages
    // workflow to build the historical dashboard. Allure runs only on CI to
    // keep local `pnpm test` fast.
    reporters: process.env.CI
      ? ['default', 'junit', ['allure-vitest/reporter', { resultsDir: './allure-results' }]]
      : ['default'],
    outputFile: { junit: './reports/junit.xml' },
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
