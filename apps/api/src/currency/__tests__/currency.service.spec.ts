import { Test, TestingModule } from '@nestjs/testing'
import { CurrencyService } from '../currency.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const ORIGINAL_API_KEY = process.env.EXCHANGE_RATE_API_KEY
const ORIGINAL_FETCH = global.fetch

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/currency')
  await $allureSubSuite('currency.service')
  await $allureSeverity('normal')
})

describe('CurrencyService', () => {
  let currencyService: CurrencyService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CurrencyService],
    }).compile()
    currencyService = module.get<CurrencyService>(CurrencyService)
  })

  afterEach(() => {
    process.env.EXCHANGE_RATE_API_KEY = ORIGINAL_API_KEY
    global.fetch = ORIGINAL_FETCH
  })

  describe('getExchangeRates — fallback path', () => {
    it('returns fallback rates and marks stale=true when API key is missing', async () => {
      delete process.env.EXCHANGE_RATE_API_KEY

      const result = await currencyService.getExchangeRates()

      expect(result.base).toBe('USD')
      // Fallback rates from docs/09 — rough but always non-zero positive numbers.
      expect(result.rates.USD).toBe(1)
      expect(result.rates.CAD).toBeGreaterThan(0)
      expect(result.rates.GBP).toBeGreaterThan(0)
      expect(result.stale).toBe(true)
    })

    it('returns fallback when the API request throws', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-key'
      global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as typeof fetch

      const result = await currencyService.getExchangeRates()

      expect(result.stale).toBe(true)
      expect(result.rates.CAD).toBeGreaterThan(0)
    })

    it('returns fallback when the API responds non-OK', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-key'
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502 }) as typeof fetch

      const result = await currencyService.getExchangeRates()

      expect(result.stale).toBe(true)
    })

    it('returns fallback when the API payload reports an error', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-key'
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: 'error', 'error-type': 'invalid-key' }),
      }) as typeof fetch

      const result = await currencyService.getExchangeRates()

      expect(result.stale).toBe(true)
    })
  })

  describe('getExchangeRates — happy path', () => {
    it('returns live rates from the API when the response is valid', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-key'
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: 'success',
            conversion_rates: { USD: 1, CAD: 1.42, GBP: 0.83, EUR: 0.91 },
          }),
      }) as typeof fetch

      const result = await currencyService.getExchangeRates()

      expect(result.stale).toBe(false)
      expect(result.rates.USD).toBe(1)
      expect(result.rates.CAD).toBe(1.42)
      expect(result.rates.GBP).toBe(0.83)
      // EUR isn't a supported display currency yet — must not leak into rates
      expect(Object.keys(result.rates).sort()).toEqual(['CAD', 'GBP', 'USD'])
    })

    it('keeps the fallback for a currency missing from the API payload', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-key'
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: 'success',
            // CAD missing — service must fall back for that one currency only.
            conversion_rates: { USD: 1, GBP: 0.83 },
          }),
      }) as typeof fetch

      const result = await currencyService.getExchangeRates()

      expect(result.rates.GBP).toBe(0.83)
      // CAD falls back, not 0 / undefined
      expect(result.rates.CAD).toBeGreaterThan(0)
    })
  })

  describe('caching', () => {
    it('does not hit the API on the second call within the TTL window', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-key'
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: 'success',
            conversion_rates: { USD: 1, CAD: 1.42, GBP: 0.83 },
          }),
      })
      global.fetch = fetchSpy as typeof fetch

      await currencyService.getExchangeRates()
      await currencyService.getExchangeRates()

      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('stamps fetchedAt even on failure so the storefront sees a fresh timestamp', async () => {
      process.env.EXCHANGE_RATE_API_KEY = 'test-key'
      global.fetch = jest.fn().mockRejectedValue(new Error('boom')) as typeof fetch

      const before = Date.now()
      const result = await currencyService.getExchangeRates()
      const fetchedAtMs = new Date(result.fetchedAt).getTime()

      // Within ~1s — pinning the timestamp prevents a hot loop of retries on
      // every request when the upstream API is down.
      expect(fetchedAtMs).toBeGreaterThanOrEqual(before)
    })
  })
})
