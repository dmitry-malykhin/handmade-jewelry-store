'use client'

import { useEffect } from 'react'
import { refreshAccessToken } from '@/lib/api/auth'
import { useAuthStore } from '@/store/auth.store'

// Access token lives in memory only (#590): page refresh wipes it, so we
// probe the HttpOnly refresh cookie once on mount. A 401 just means there is
// no active session; keep the store empty and let routes decide.
//
// Guard against StrictMode double-invoke: skip the fetch if the store already
// holds a token (the first mount completed before the second).
export function AuthBootstrap() {
  useEffect(() => {
    const { accessToken, setTokens } = useAuthStore.getState()
    if (accessToken) return
    let cancelled = false
    void refreshAccessToken()
      .then((tokens) => {
        if (!cancelled) setTokens(tokens.accessToken, tokens.refreshToken)
      })
      .catch(() => {
        // No refresh cookie or token expired: user stays anonymous.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
