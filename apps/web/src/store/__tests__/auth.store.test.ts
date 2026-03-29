import { act, renderHook } from '@testing-library/react'
import { useAuthStore } from '../auth.store'

// Minimal valid JWT with payload { sub: 'user-1', email: 'test@test.com', role: 'ADMIN' }
// Header: {"alg":"HS256","typ":"JWT"}, Payload: {"sub":"user-1","email":"test@test.com","role":"ADMIN"}
const adminJwt =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiJ1c2VyLTEiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJyb2xlIjoiQURNSU4ifQ.' +
  'signature'

const userJwt =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiJ1c2VyLTIiLCJlbWFpbCI6InVzZXJAdGVzdC5jb20iLCJyb2xlIjoiVVNFUiJ9.' +
  'signature'

const malformedJwt = 'not.a.jwt.token.structure'

// JWT with no role field in payload: { sub: 'user-3', email: 'norole@test.com' }
const noRoleJwt =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiJ1c2VyLTMiLCJlbWFpbCI6Im5vcm9sZUB0ZXN0LmNvbSJ9.' +
  'signature'

beforeEach(() => {
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    role: null,
  })
})

describe('useAuthStore', () => {
  describe('setTokens', () => {
    it('sets accessToken, refreshToken, and isAuthenticated', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setTokens(adminJwt, 'refresh-token')
      })

      expect(result.current.accessToken).toBe(adminJwt)
      expect(result.current.refreshToken).toBe('refresh-token')
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('extracts ADMIN role from JWT payload', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setTokens(adminJwt, 'refresh-token')
      })

      expect(result.current.role).toBe('ADMIN')
    })

    it('extracts USER role from JWT payload', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setTokens(userJwt, 'refresh-token')
      })

      expect(result.current.role).toBe('USER')
    })

    it('sets role to null when JWT payload cannot be decoded', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setTokens(malformedJwt, 'refresh-token')
      })

      expect(result.current.role).toBeNull()
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('sets role to null when JWT payload has no role field', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setTokens(noRoleJwt, 'refresh-token')
      })

      expect(result.current.role).toBeNull()
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('overwrites previous auth state on second call', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setTokens(userJwt, 'refresh-token-v1')
      })
      act(() => {
        result.current.setTokens(adminJwt, 'refresh-token-v2')
      })

      expect(result.current.role).toBe('ADMIN')
      expect(result.current.refreshToken).toBe('refresh-token-v2')
    })
  })

  describe('rehydration from localStorage', () => {
    it('derives isAuthenticated and ADMIN role from persisted accessToken', () => {
      // Simulate what onRehydrateStorage does after localStorage restore:
      // inject a persisted state that only has tokens (no isAuthenticated/role)
      useAuthStore.setState({
        accessToken: adminJwt,
        refreshToken: 'refresh-token',
        isAuthenticated: false, // not yet derived
        role: null,
      })

      // Manually trigger rehydration (same logic as onRehydrateStorage callback)
      useAuthStore.persist.rehydrate()

      // After rehydration the store should derive isAuthenticated and role
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.role).toBe('ADMIN')
    })

    it('leaves isAuthenticated false when accessToken is null in persisted state', () => {
      useAuthStore.setState({
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        role: null,
      })

      useAuthStore.persist.rehydrate()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.role).toBeNull()
    })
  })

  describe('clearTokens', () => {
    it('clears all auth state including role', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setTokens(adminJwt, 'refresh-token')
      })
      act(() => {
        result.current.clearTokens()
      })

      expect(result.current.accessToken).toBeNull()
      expect(result.current.refreshToken).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.role).toBeNull()
    })
  })
})
