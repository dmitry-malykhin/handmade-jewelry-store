import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import {
  changePassword,
  fetchCurrentUser,
  forgotPassword,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
} from '../auth'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('auth')
  await $allureSeverity('normal')
})

describe('auth API', () => {
  it('registerUser POSTs email/password and returns tokens', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/auth/register`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ accessToken: 'a-tok', refreshToken: 'r-tok' })
      }),
    )

    const result = await registerUser('a@b.com', 'pass1234')

    expect(receivedBody).toEqual({ email: 'a@b.com', password: 'pass1234' })
    expect(result.accessToken).toBe('a-tok')
  })

  it('loginUser POSTs to /login with credentials', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/auth/login`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ accessToken: 'a', refreshToken: 'r' })
      }),
    )

    await loginUser('a@b.com', 'pass1234')

    expect(receivedBody).toEqual({ email: 'a@b.com', password: 'pass1234' })
  })

  it('forgotPassword POSTs only the email', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/auth/forgot-password`, async ({ request }) => {
        receivedBody = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await forgotPassword('a@b.com')

    expect(receivedBody).toEqual({ email: 'a@b.com' })
  })

  it('resetPassword POSTs token and new password', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/auth/reset-password`, async ({ request }) => {
        receivedBody = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await resetPassword('reset-tok', 'newpass1234')

    expect(receivedBody).toEqual({ token: 'reset-tok', newPassword: 'newpass1234' })
  })

  it('logoutUser sends the refresh token as bearer auth (not the access token)', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.post(`${API_BASE}/api/auth/logout`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await logoutUser('refresh-xyz')

    expect(receivedAuth).toBe('Bearer refresh-xyz')
  })

  it('changePassword PATCHes /change-password with both passwords', async () => {
    let receivedBody: unknown = null
    let receivedMethod: string | null = null
    server.use(
      http.patch(`${API_BASE}/api/auth/change-password`, async ({ request }) => {
        receivedMethod = request.method
        receivedBody = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await changePassword('a-tok', 'old', 'new1234')

    expect(receivedMethod).toBe('PATCH')
    expect(receivedBody).toEqual({ currentPassword: 'old', newPassword: 'new1234' })
  })

  it('fetchCurrentUser returns the authenticated user profile', async () => {
    server.use(
      http.get(`${API_BASE}/api/auth/me`, () =>
        HttpResponse.json({
          id: 'u1',
          email: 'a@b.com',
          role: 'USER',
          createdAt: '2026-01-01',
        }),
      ),
    )

    const user = await fetchCurrentUser('a-tok')

    expect(user.role).toBe('USER')
  })
})
