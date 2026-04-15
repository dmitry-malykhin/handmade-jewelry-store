import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Lower sample rate on server — most interesting errors are 5xx which always get captured.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
