// MUST be the first import in main.ts — Sentry hooks async_hooks/diagnostics_channel
// before any other module loads. Otherwise early errors and traces are missed.
import * as Sentry from '@sentry/nestjs'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV ?? 'development',

  release: process.env.APP_VERSION,

  integrations: [nodeProfilingIntegration(), Sentry.prismaIntegration()],

  // 10% prod sample — within free-tier quota.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  profilesSampleRate: 0.05,

  enabled: !!process.env.SENTRY_DSN,
})
