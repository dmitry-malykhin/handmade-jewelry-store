import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import {
  severity as $allureSeverity,
  subSuite as $allureSubSuite,
  suite as $allureSuite,
} from 'allure-js-commons'

const mockRefreshAccessToken = vi.fn()
vi.mock('@/lib/api/auth', () => ({
  refreshAccessToken: () => mockRefreshAccessToken(),
}))

import { useAuthStore } from '@/store/auth.store'
import { AuthBootstrap } from '../auth-bootstrap'

const validJwt =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiJ1LTEiLCJlbWFpbCI6ImhpQHRlc3QuY29tIiwicm9sZSI6IlVTRVIifQ.' +
  'sig'

beforeEach(async () => {
  vi.clearAllMocks()
  useAuthStore.setState({ accessToken: null, isAuthenticated: false, role: null })
  if (!process.env.CI) return
  await $allureSuite('web/components/shared')
  await $allureSubSuite('auth-bootstrap')
  await $allureSeverity('critical')
})

describe('AuthBootstrap (#590)', () => {
  it('calls refreshAccessToken on mount and stores the fresh token in memory', async () => {
    mockRefreshAccessToken.mockResolvedValueOnce({
      accessToken: validJwt,
      refreshToken: 'cookie-rotated-server-side',
    })

    render(<AuthBootstrap />)

    await waitFor(() => expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe(validJwt))
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('leaves the store empty when the refresh cookie is absent or expired (401)', async () => {
    mockRefreshAccessToken.mockRejectedValueOnce(new Error('401 Unauthorized'))

    render(<AuthBootstrap />)

    await waitFor(() => expect(mockRefreshAccessToken).toHaveBeenCalled())
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('skips the refresh call when a token is already in memory (e.g. just logged in)', async () => {
    useAuthStore.setState({ accessToken: validJwt, isAuthenticated: true, role: 'USER' })

    render(<AuthBootstrap />)

    // Microtask tick: effect has run but should have early-returned.
    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe(validJwt))
    expect(mockRefreshAccessToken).not.toHaveBeenCalled()
  })
})
