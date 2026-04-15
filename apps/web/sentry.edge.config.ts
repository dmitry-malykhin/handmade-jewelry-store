import * as Sentry from '@sentry/nextjs'

// Edge runtime config — used by middleware and edge API routes.
// Keep minimal: no profiling, no replay (not supported in edge runtime).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
