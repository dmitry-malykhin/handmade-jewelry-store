import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as Sentry from '@sentry/nextjs'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { captureAdminError } from '../capture-admin-error'
import { ApiError } from '@/lib/api/client'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

const mockCaptureException = vi.mocked(Sentry.captureException)

beforeEach(async () => {
  vi.clearAllMocks()
  if (!process.env.CI) return
  await $allureSuite('web/lib/sentry')
  await $allureSubSuite('capture-admin-error')
  await $allureSeverity('normal')
})

describe('captureAdminError', () => {
  it('captures non-ApiError with adminAction tag + admin context', () => {
    const error = new Error('Network down')

    captureAdminError(error, { action: 'orders.updateStatus', orderId: 'o-1', newStatus: 'PAID' })

    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      tags: { adminAction: 'orders.updateStatus' },
      contexts: { admin: { action: 'orders.updateStatus', orderId: 'o-1', newStatus: 'PAID' } },
    })
  })

  it('captures ApiError 5xx (upstream failure) with admin context', () => {
    const error = new ApiError(503, 'Service unavailable')

    captureAdminError(error, { action: 'products.delete', productId: 'p-1' })

    expect(mockCaptureException).toHaveBeenCalledTimes(1)
    expect(mockCaptureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ tags: { adminAction: 'products.delete' } }),
    )
  })

  it('SKIPS ApiError 4xx — user/validation errors handled by toast, not Sentry', () => {
    const badRequest = new ApiError(400, 'Invalid slug')
    const notFound = new ApiError(404, 'Not found')
    const conflict = new ApiError(409, 'Conflict')

    captureAdminError(badRequest, { action: 'products.create' })
    captureAdminError(notFound, { action: 'orders.get' })
    captureAdminError(conflict, { action: 'products.update' })

    expect(mockCaptureException).not.toHaveBeenCalled()
  })
})
