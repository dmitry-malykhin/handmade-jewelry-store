import { create } from 'zustand'
import type { UserProfile } from '@jewelry/shared'

interface UserStore {
  user: UserProfile | null

  /** Set the authenticated user (called after login / token refresh). */
  setUser: (user: UserProfile) => void

  /** Clear user data on logout. */
  clearUser: () => void
}

/**
 * In-memory user store — intentionally NOT persisted to localStorage.
 * Auth state is managed via HTTP-only cookie (secure, not readable by JS).
 * The user profile will be fetched from the API on mount via TanStack Query (W7).
 */
export const useUserStore = create<UserStore>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}))

// ── Selector hooks ────────────────────────────────────────────────────────────

export const useCurrentUser = () => useUserStore((s) => s.user)

export const useIsAuthenticated = () => useUserStore((s) => s.user !== null)
