import * as Sentry from '@sentry/nextjs'

// Server + edge Sentry init. Next.js calls register() once per runtime at
// process start, so the init runs exactly once for the lifetime of the worker.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      // Lower sample rate on server — most interesting errors are 5xx which always get captured.
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime: no profiling, no replay (not supported in edge runtime).
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    })
  }
}

// Capture errors from Server Components, middleware, server actions, and proxies.
// Next.js calls this hook on every request-time error.
export const onRequestError = Sentry.captureRequestError
