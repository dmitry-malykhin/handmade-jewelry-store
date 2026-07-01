import { describe, it, expect, beforeEach } from 'vitest'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { toQueryString } from '../query-string'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('query-string')
  await $allureSeverity('normal')
})

describe('toQueryString()', () => {
  it('returns an empty string for an empty params object (no leading ?)', () => {
    expect(toQueryString({})).toBe('')
  })

  it('returns an empty string when every value is undefined/null/empty', () => {
    expect(toQueryString({ a: undefined, b: null, c: '' })).toBe('')
  })

  it('serializes defined string / number / boolean values', () => {
    expect(toQueryString({ page: 2, status: 'PAID', lowStockOnly: true })).toBe(
      '?page=2&status=PAID&lowStockOnly=true',
    )
  })

  it('skips undefined / null / empty string values but keeps 0 and false', () => {
    expect(toQueryString({ page: 0, active: false, note: undefined, empty: '' })).toBe(
      '?page=0&active=false',
    )
  })

  it('URL-encodes spaces and special characters in values', () => {
    const query = toQueryString({ search: 'silver ring & pendant' })
    expect(query).toBe('?search=silver+ring+%26+pendant')
  })

  it('preserves the order in which keys appear in the input object', () => {
    expect(toQueryString({ z: 1, a: 2, m: 3 })).toBe('?z=1&a=2&m=3')
  })
})
