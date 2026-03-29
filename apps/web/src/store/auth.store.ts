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
  refreshToken: string | null
  isAuthenticated: boolean
  role: UserRole | null

  /** Store tokens after successful login or register. */
  setTokens: (accessToken: string, refreshToken: string) => void

  /** Clear tokens on logout. */
  clearTokens: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      role: null,

      setTokens: (accessToken, refreshToken) => {
        const payload = decodeJwtPayload(accessToken)
        set({ accessToken, refreshToken, isAuthenticated: true, role: payload?.role ?? null })
      },

      clearTokens: () => {
        set({ accessToken: null, refreshToken: null, isAuthenticated: false, role: null })
      },
    }),
    {
      name: 'auth-store',
      // Only persist tokens — isAuthenticated and role are derived on rehydration
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      // Derive isAuthenticated and role from persisted tokens on rehydration
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
