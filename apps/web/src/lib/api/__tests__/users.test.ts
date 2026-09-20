import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import { fetchProfile, updateProfile } from '../users'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('users')
  await $allureSeverity('normal')
})

describe('users API', () => {
  it('fetchProfile GETs /users/me with bearer auth', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/users/me`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({ id: 'u1', email: 'a@b.com', name: 'Ada', phone: null })
      }),
    )

    const profile = await fetchProfile('token-xyz')

    expect(receivedAuth).toBe('Bearer token-xyz')
    expect(profile.name).toBe('Ada')
    expect(profile.phone).toBeNull()
  })

  it('updateProfile PATCHes /users/me with the given fields', async () => {
    let receivedBody: unknown = null
    let receivedMethod: string | null = null
    server.use(
      http.patch(`${API_BASE}/api/users/me`, async ({ request }) => {
        receivedMethod = request.method
        receivedBody = await request.json()
        return HttpResponse.json({
          id: 'u1',
          email: 'a@b.com',
          name: 'Ada Lovelace',
          phone: '+34123',
        })
      }),
    )

    const updated = await updateProfile('token-xyz', {
      name: 'Ada Lovelace',
      phone: '+34123',
    })

    expect(receivedMethod).toBe('PATCH')
    expect(receivedBody).toEqual({ name: 'Ada Lovelace', phone: '+34123' })
    expect(updated.name).toBe('Ada Lovelace')
  })
})
