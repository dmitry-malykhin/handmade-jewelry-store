import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // `allure-vitest/setup` MUST come first so allure.suite() resolves in every
    // beforeAll/beforeEach across the project.
    setupFiles: ['allure-vitest/setup', './vitest.setup.ts'],
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    // Allure only on CI — keeps local `pnpm test` fast.
    reporters: process.env.CI
      ? ['default', 'junit', ['allure-vitest/reporter', { resultsDir: './allure-results' }]]
      : ['default'],
    outputFile: { junit: './reports/junit.xml' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/components/ui/',
        '.next/',
        'src/test-utils/',
        '**/*.config.{ts,js}',
      ],
    },
  },
  resolve: {
    alias: {
      // Must mirror tsconfig paths so `@/...` resolves in tests.
      '@': resolve(__dirname, './src'),
    },
  },
})
