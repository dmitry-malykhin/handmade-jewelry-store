import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './src/test-utils/msw/server'

// Start MSW server before all tests — intercepts fetch at Node.js level
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Reset any runtime handlers added during individual tests
afterEach(() => server.resetHandlers())

// Clean up after all tests complete
afterAll(() => server.close())
