import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * MSW Node.js server — intercepts fetch calls at the Node level during tests.
 * Started in vitest.setup.ts: listen → resetHandlers → close lifecycle.
 */
export const server = setupServer(...handlers)
