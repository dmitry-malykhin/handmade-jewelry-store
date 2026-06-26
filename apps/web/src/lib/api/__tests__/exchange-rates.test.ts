import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import { fetchExchangeRates } from '../exchange-rates'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('exchange-rates')
  await $allureSeverity('normal')
})

describe('exchange-rates API', () => {
  it('GETs /api/exchange-rates and returns the rate map', async () => {
    server.use(
      http.get(`${API_BASE}/api/exchange-rates`, () =>
        HttpResponse.json({
          base: 'USD',
          rates: { USD: 1, CAD: 1.35, GBP: 0.79 },
          fetchedAt: '2026-01-01T00:00:00.000Z',
          stale: false,
        }),
      ),
    )

    const result = await fetchExchangeRates()

    expect(result.base).toBe('USD')
    expect(result.rates.CAD).toBe(1.35)
    expect(result.stale).toBe(false)
  })

  it('passes through the stale=true flag when server is serving fallback', async () => {
    server.use(
      http.get(`${API_BASE}/api/exchange-rates`, () =>
        HttpResponse.json({
          base: 'USD',
          rates: { USD: 1, CAD: 1.3, GBP: 0.8 },
          fetchedAt: '2026-01-01T00:00:00.000Z',
          stale: true,
        }),
      ),
    )

    const result = await fetchExchangeRates()

    expect(result.stale).toBe(true)
  })
})
