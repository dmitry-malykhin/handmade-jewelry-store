import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore {
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

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

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true })
      },

      clearTokens: () => {
        set({ accessToken: null, refreshToken: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-store',
      // Only persist tokens — isAuthenticated is derived on rehydration
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      // Derive isAuthenticated from persisted tokens on rehydration
      onRehydrateStorage: () => (rehydratedState: AuthStore | undefined) => {
        if (rehydratedState) {
          rehydratedState.isAuthenticated = rehydratedState.accessToken !== null
        }
      },
      // skipHydration prevents SSR/client mismatch — store rehydrates on client only.
      // Call useAuthStore.persist.rehydrate() in a root client component if needed.
      skipHydration: true,
    },
  ),
)
