import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import { isAllowedImageType, requestPresignedUrl, MAX_IMAGE_SIZE_BYTES } from '../upload'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('upload')
  await $allureSeverity('normal')
})

describe('upload — isAllowedImageType', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (mime) => {
    expect(isAllowedImageType(mime)).toBe(true)
  })

  it.each(['image/gif', 'application/pdf', 'text/plain', ''])('rejects %s', (mime) => {
    expect(isAllowedImageType(mime)).toBe(false)
  })

  it('exposes the 5 MB max file size constant', () => {
    expect(MAX_IMAGE_SIZE_BYTES).toBe(5 * 1024 * 1024)
  })
})

describe('upload — requestPresignedUrl', () => {
  it('POSTs filename + contentType with bearer auth and returns the URLs', async () => {
    let receivedBody: unknown = null
    let receivedAuth: string | null = null
    server.use(
      http.post(`${API_BASE}/api/upload/presigned-url`, async ({ request }) => {
        receivedBody = await request.json()
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({
          uploadUrl: 'https://s3.example.com/upload',
          publicUrl: 'https://cdn.example.com/products/abc.jpg',
        })
      }),
    )

    const result = await requestPresignedUrl('photo.jpg', 'image/jpeg', 'token-x')

    expect(receivedBody).toEqual({ fileName: 'photo.jpg', contentType: 'image/jpeg' })
    expect(receivedAuth).toBe('Bearer token-x')
    expect(result.publicUrl).toMatch(/\/products\/abc\.jpg$/)
  })
})
