import { create } from 'zustand'

export type UserRole = 'USER' | 'ADMIN'

interface JwtPayload {
  sub: string
  email: string
  role: UserRole
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    // JWT payload is the second segment, base64url-encoded
    const segment = token.split('.')[1]
    if (!segment) return null
    const base64Payload = segment.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64Payload)) as JwtPayload
  } catch {
    return null
  }
}

interface AuthStore {
  accessToken: string | null
  isAuthenticated: boolean
  role: UserRole | null

  /**
   * Store the access token after login/register/refresh. The refresh token
   * lives in an HttpOnly cookie set by the API; the access token is kept in
   * memory only so XSS cannot exfiltrate it from localStorage (#590).
   * 2nd arg ignored — kept for call-site backward compat during rollout.
   */
  setTokens: (accessToken: string, _legacyRefreshTokenIgnored?: string) => void

  /** Clear the access token on logout. Cookie is cleared by the API. */
  clearTokens: () => void
}

// No persist middleware: the access token is memory-only (#590). A page
// refresh zeroes the store; AuthBootstrap calls POST /auth/refresh with the
// HttpOnly cookie to rehydrate. `role`/`isAuthenticated` are deterministic
// from the token, so persisting them is both unnecessary and unsafe (would
// flicker a "signed in" header even when the refresh cookie is already gone).
export const useAuthStore = create<AuthStore>()((set) => ({
  accessToken: null,
  isAuthenticated: false,
  role: null,

  setTokens: (accessToken) => {
    const payload = decodeJwtPayload(accessToken)
    set({ accessToken, isAuthenticated: true, role: payload?.role ?? null })
  },

  clearTokens: () => {
    set({ accessToken: null, isAuthenticated: false, role: null })
  },
}))
