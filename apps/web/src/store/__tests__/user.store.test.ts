import { describe, it, expect, beforeEach } from 'vitest'
import { useUserStore, useCurrentUser, useIsAuthenticated } from '@/store/user.store'
import { renderHook, act } from '@testing-library/react'
import type { UserProfile } from '@jewelry/shared'

const mockUser: UserProfile = {
  id: 'user-1',
  email: 'jane@example.com',
  name: 'Jane Smith',
  role: 'customer',
  avatarUrl: null,
}

const mockAdminUser: UserProfile = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
  avatarUrl: 'https://example.com/avatar.jpg',
}

// Reset store to unauthenticated state before each test
beforeEach(() => {
  useUserStore.setState({ user: null })
})

// ── setUser ────────────────────────────────────────────────────────────────────

describe('setUser()', () => {
  it('sets the authenticated user profile', () => {
    useUserStore.getState().setUser(mockUser)
    expect(useUserStore.getState().user).toEqual(mockUser)
  })

  it('stores all user profile fields correctly', () => {
    useUserStore.getState().setUser(mockUser)

    const { user } = useUserStore.getState()
    expect(user?.id).toBe('user-1')
    expect(user?.email).toBe('jane@example.com')
    expect(user?.name).toBe('Jane Smith')
    expect(user?.role).toBe('customer')
    expect(user?.avatarUrl).toBeNull()
  })

  it('replaces the current user when called again', () => {
    useUserStore.getState().setUser(mockUser)
    useUserStore.getState().setUser(mockAdminUser)

    expect(useUserStore.getState().user?.id).toBe('admin-1')
    expect(useUserStore.getState().user?.role).toBe('admin')
  })
})

// ── clearUser ──────────────────────────────────────────────────────────────────

describe('clearUser()', () => {
  it('sets user to null (logout)', () => {
    useUserStore.getState().setUser(mockUser)
    useUserStore.getState().clearUser()

    expect(useUserStore.getState().user).toBeNull()
  })

  it('does not throw when called on an already unauthenticated state', () => {
    expect(() => useUserStore.getState().clearUser()).not.toThrow()
  })
})

// ── selector hooks ─────────────────────────────────────────────────────────────

describe('useCurrentUser()', () => {
  it('returns null when no user is logged in', () => {
    const { result } = renderHook(() => useCurrentUser())
    expect(result.current).toBeNull()
  })

  it('returns the user profile after login', () => {
    act(() => {
      useUserStore.getState().setUser(mockUser)
    })

    const { result } = renderHook(() => useCurrentUser())
    expect(result.current?.email).toBe('jane@example.com')
  })
})

describe('useIsAuthenticated()', () => {
  it('returns false when no user is logged in', () => {
    const { result } = renderHook(() => useIsAuthenticated())
    expect(result.current).toBe(false)
  })

  it('returns true after a user is set', () => {
    act(() => {
      useUserStore.getState().setUser(mockUser)
    })

    const { result } = renderHook(() => useIsAuthenticated())
    expect(result.current).toBe(true)
  })

  it('returns false again after logout', () => {
    act(() => {
      useUserStore.getState().setUser(mockUser)
      useUserStore.getState().clearUser()
    })

    const { result } = renderHook(() => useIsAuthenticated())
    expect(result.current).toBe(false)
  })
})
