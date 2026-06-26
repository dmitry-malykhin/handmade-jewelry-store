import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import {
  calculateMaxRedeemablePoints,
  fetchLoyaltyBalance,
  fetchLoyaltyTransactions,
} from '../loyalty'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('loyalty')
  await $allureSeverity('normal')
})

describe('loyalty API — fetchers', () => {
  it('fetchLoyaltyBalance GETs /balance with bearer auth', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/loyalty/balance`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({ balance: 250 })
      }),
    )

    const balance = await fetchLoyaltyBalance('token-x')

    expect(receivedAuth).toBe('Bearer token-x')
    expect(balance.balance).toBe(250)
  })

  it('fetchLoyaltyTransactions GETs /transactions and returns the array', async () => {
    server.use(
      http.get(`${API_BASE}/api/loyalty/transactions`, () =>
        HttpResponse.json([
          {
            id: 't1',
            points: 100,
            type: 'EARNED',
            orderId: 'o1',
            note: null,
            createdAt: '2026-01-01',
          },
        ]),
      ),
    )

    const transactions = await fetchLoyaltyTransactions('token-x')

    expect(transactions[0]?.type).toBe('EARNED')
  })
})

describe('loyalty — calculateMaxRedeemablePoints', () => {
  it('returns 50% of subtotal in points (1 USD = 100 points)', () => {
    expect(calculateMaxRedeemablePoints(100)).toBe(5000)
    expect(calculateMaxRedeemablePoints(49.99)).toBe(2499)
  })

  it('returns 0 for non-finite, zero, or negative subtotals', () => {
    expect(calculateMaxRedeemablePoints(0)).toBe(0)
    expect(calculateMaxRedeemablePoints(-10)).toBe(0)
    expect(calculateMaxRedeemablePoints(Number.NaN)).toBe(0)
    expect(calculateMaxRedeemablePoints(Number.POSITIVE_INFINITY)).toBe(0)
  })
})
