// Guest order-access tokens used to live in the Stripe `return_url`'s query
// string, which kept them in `window.location.href` for the ~100 ms between
// redirect landing and the client-side URL scrub. That window is enough for
// session-replay tools (Clarity, FullStory) and URL-bar-reading browser
// extensions to capture the token. sessionStorage is tab-isolated and the
// token never enters the URL, history, or any replay stream.
//
// Key format: one entry per orderId so parallel checkouts in two tabs cannot
// cross-contaminate.

const KEY_PREFIX = 'orderAccessToken:'

function keyOf(orderId: string): string {
  return `${KEY_PREFIX}${orderId}`
}

function hasSessionStorage(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return typeof window.sessionStorage !== 'undefined'
  } catch {
    return false
  }
}

export function rememberGuestOrderAccessToken(orderId: string, token: string): void {
  if (!hasSessionStorage()) return
  try {
    window.sessionStorage.setItem(keyOf(orderId), token)
  } catch {
    // Private-mode Safari or quota failure: fall through silently; the server
    // page will still accept a legacy `?token=` from URL as a last resort.
  }
}

// Read + delete in one shot so a viewer cannot re-use the token by hitting
// Back; also keeps sessionStorage empty for future checkouts in the same tab.
export function consumeGuestOrderAccessToken(orderId: string): string | null {
  if (!hasSessionStorage()) return null
  try {
    const stored = window.sessionStorage.getItem(keyOf(orderId))
    if (stored !== null) {
      window.sessionStorage.removeItem(keyOf(orderId))
    }
    return stored
  } catch {
    return null
  }
}

export function peekGuestOrderAccessToken(orderId: string): string | null {
  if (!hasSessionStorage()) return null
  try {
    return window.sessionStorage.getItem(keyOf(orderId))
  } catch {
    return null
  }
}
