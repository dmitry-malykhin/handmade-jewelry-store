import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Sample 10% of requests in production to stay within free tier quota (5k errors/month).
  // 100% in non-production so every trace is visible during development and staging.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Record a session replay for every session where an error occurs.
  // Only 1% of error-free sessions — keeps monthly quota manageable.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.01,

  integrations: [
    Sentry.replayIntegration({
      // Mask password inputs and any element marked data-sentry-mask.
      // Leave other text visible — we need button labels and navigation for debugging.
      mask: ['[type="password"]', '[data-sentry-mask]'],
      blockAllMedia: false,
    }),
  ],

  // Filter out known noise before sending to Sentry.
  // Reduces quota usage and keeps the issue list focused on real bugs.
  beforeSend(event, hint) {
    const error = hint.originalException

    // AbortError: user navigated away mid-request — not a bug
    if (error instanceof Error && error.name === 'AbortError') {
      return null
    }

    // Browser extension errors — not our code
    const frames = event.exception?.values?.[0]?.stacktrace?.frames
    if (frames?.some((frame) => frame.filename?.includes('extension://'))) {
      return null
    }

    return event
  },

  // Do not send events when DSN is not configured (local dev without Sentry account)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
