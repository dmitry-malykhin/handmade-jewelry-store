import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
   * Store the access token after login/register/refresh. The refresh token now
   * lives in an HttpOnly cookie set by the API — never touches JS/localStorage.
   * 2nd arg ignored — kept for call-site backward compat during rollout.
   */
  setTokens: (accessToken: string, _legacyRefreshTokenIgnored?: string) => void

  /** Clear the access token on logout. Cookie is cleared by the API. */
  clearTokens: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ accessToken: state.accessToken }),
      onRehydrateStorage: () => (rehydratedState: AuthStore | undefined) => {
        if (rehydratedState?.accessToken) {
          const payload = decodeJwtPayload(rehydratedState.accessToken)
          rehydratedState.isAuthenticated = true
          rehydratedState.role = payload?.role ?? null
        }
      },
      // skipHydration prevents SSR/client mismatch — store rehydrates on client only.
      // Call useAuthStore.persist.rehydrate() in a root client component if needed.
      skipHydration: true,
    },
  ),
)
