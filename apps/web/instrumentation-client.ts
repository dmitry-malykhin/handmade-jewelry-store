import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // 10% of prod requests + 100% of error replays — stays within free-tier quota.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.01,

  integrations: [
    Sentry.replayIntegration({
      // Other text stays visible — we need labels/navigation for debugging.
      mask: ['[type="password"]', '[data-sentry-mask]'],
      blockAllMedia: false,
    }),
  ],

  beforeSend(event, hint) {
    const error = hint.originalException

    // User navigated mid-request — not a bug.
    if (error instanceof Error && error.name === 'AbortError') {
      return null
    }

    // Browser extension throwing in user's page — not our code.
    const frames = event.exception?.values?.[0]?.stacktrace?.frames
    if (frames?.some((frame) => frame.filename?.includes('extension://'))) {
      return null
    }

    return event
  },

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})

// Required for App Router client navigations to surface as Sentry transactions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
