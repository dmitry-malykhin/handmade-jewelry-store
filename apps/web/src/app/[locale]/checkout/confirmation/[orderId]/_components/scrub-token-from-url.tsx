'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Strips `?token=…` from the URL after Stripe redirect, preventing leak via
// browser history, Referer on outbound clicks, and session-replay.
export function ScrubTokenFromUrl() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.search.includes('token=')) {
      window.history.replaceState(null, '', pathname)
    }
  }, [pathname])

  return null
}
