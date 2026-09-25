import { describe, it, expect } from 'vitest'
import enMessages from '../../../../messages/en.json'
import ruMessages from '../../../../messages/ru.json'
import esMessages from '../../../../messages/es.json'
import { COOKIE_REGISTRY, getCookiesByCategory } from '../cookie-registry'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/legal')
  await $allureSubSuite('cookie-registry')
  await $allureSeverity('critical')
})

describe('COOKIE_REGISTRY', () => {
  it('contains at least one entry per user-visible category', () => {
    expect(getCookiesByCategory('necessary').length).toBeGreaterThan(0)
    expect(getCookiesByCategory('analytics').length).toBeGreaterThan(0)
    expect(getCookiesByCategory('marketing').length).toBeGreaterThan(0)
  })

  it('every entry has all disclosure fields populated (EDPB Guidelines 03/2022)', () => {
    for (const cookie of COOKIE_REGISTRY) {
      expect(cookie.name).toBeTruthy()
      expect(cookie.provider).toBeTruthy()
      expect(cookie.purposeKey).toBeTruthy()
      expect(cookie.duration).toBeTruthy()
      expect(cookie.dataTransferCountry).toBeTruthy()
    }
  })

  it('every purposeKey resolves in en/ru/es messages (no missing translations)', () => {
    for (const cookie of COOKIE_REGISTRY) {
      const enPurpose = (enMessages.cookiePolicy.purposes as Record<string, string | undefined>)[
        cookie.purposeKey
      ]
      const ruPurpose = (ruMessages.cookiePolicy.purposes as Record<string, string | undefined>)[
        cookie.purposeKey
      ]
      const esPurpose = (esMessages.cookiePolicy.purposes as Record<string, string | undefined>)[
        cookie.purposeKey
      ]
      expect(enPurpose, `en missing purpose for ${cookie.purposeKey}`).toBeTruthy()
      expect(ruPurpose, `ru missing purpose for ${cookie.purposeKey}`).toBeTruthy()
      expect(esPurpose, `es missing purpose for ${cookie.purposeKey}`).toBeTruthy()
    }
  })

  it('names are unique across the registry', () => {
    const names = COOKIE_REGISTRY.map((cookie) => cookie.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
