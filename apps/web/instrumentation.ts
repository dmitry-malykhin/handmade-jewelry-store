import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      // 5% on server — 5xx are always captured separately as errors.
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // No profiling / replay on edge — runtime doesn't support them.
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    })
  }
}

export const onRequestError = Sentry.captureRequestError
