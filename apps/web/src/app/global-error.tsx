'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

// global-error.tsx replaces the root layout when an unhandled error occurs.
// It must include <html> and <body> tags because the normal layout is bypassed.
// Sentry captures the error here so crashes in the root layout are tracked.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'sans-serif',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Something went wrong</h2>
        <p style={{ color: '#666', maxWidth: '480px' }}>
          Our team has been notified. Please try again.
        </p>
        {error.digest && (
          <p style={{ fontSize: '12px', color: '#999' }}>Error ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            background: '#111',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
