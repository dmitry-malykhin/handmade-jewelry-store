// ─────────────────────────────────────────────────────────────────────────────
// Sentry instrumentation — MUST be the very first import in main.ts.
// Sentry hooks into Node.js internals (async_hooks, diagnostics_channel) and
// must run before any other module is loaded. Importing after NestFactory
// or Prisma would miss early errors and produce incomplete traces.
// ─────────────────────────────────────────────────────────────────────────────
import * as Sentry from '@sentry/nestjs'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV ?? 'development',

  // APP_VERSION is injected by CI/CD (git tag or commit SHA).
  // Sentry uses it to associate errors with specific releases and track regressions.
  release: process.env.APP_VERSION,

  integrations: [
    nodeProfilingIntegration(),
    // Instruments Prisma queries: slow queries and DB errors appear in Sentry traces.
    Sentry.prismaIntegration(),
  ],

  // Sample 10% of requests in production to stay within the free tier quota.
  // 100% in development/staging so every trace is visible during testing.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Profile 5% of sampled transactions (CPU profiling adds minimal overhead).
  profilesSampleRate: 0.05,

  // Skip sending events when DSN is not configured (local dev without Sentry account).
  enabled: !!process.env.SENTRY_DSN,
})
