import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { getSiteUrl } from '../site-url'

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/config')
  await $allureSubSuite('site-url')
  await $allureSeverity('normal')
})

afterEach(() => {
  if (ORIGINAL_SITE_URL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL
})

describe('getSiteUrl', () => {
  it('returns NEXT_PUBLIC_SITE_URL when set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://senichka.com'
    expect(getSiteUrl()).toBe('https://senichka.com')
  })

  it('falls back to http://localhost:3000 when env is absent (regression #284)', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })

  it('fallback is NEVER the previous "https://example.com" metadataBase default', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    expect(getSiteUrl()).not.toContain('example.com')
  })

  it('reads env lazily — every call picks up the current value', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://first.example'
    expect(getSiteUrl()).toBe('https://first.example')
    process.env.NEXT_PUBLIC_SITE_URL = 'https://second.example'
    expect(getSiteUrl()).toBe('https://second.example')
  })
})
