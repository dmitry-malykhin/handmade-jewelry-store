import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { getImageCdnOrigin } from '../image-cdn'

const ORIGINAL = process.env.NEXT_PUBLIC_IMAGE_CDN_ORIGIN

beforeEach(async () => {
  delete process.env.NEXT_PUBLIC_IMAGE_CDN_ORIGIN
  if (!process.env.CI) return
  await $allureSuite('web/lib/config')
  await $allureSubSuite('image-cdn')
  await $allureSeverity('minor')
})

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_IMAGE_CDN_ORIGIN
  else process.env.NEXT_PUBLIC_IMAGE_CDN_ORIGIN = ORIGINAL
})

describe('getImageCdnOrigin', () => {
  it('returns the env-configured origin, trimmed', () => {
    process.env.NEXT_PUBLIC_IMAGE_CDN_ORIGIN = '  https://cdn.senichka.com  '
    expect(getImageCdnOrigin()).toBe('https://cdn.senichka.com')
  })

  it('returns null when the env var is unset', () => {
    expect(getImageCdnOrigin()).toBeNull()
  })

  it('returns null when the env var is only whitespace', () => {
    process.env.NEXT_PUBLIC_IMAGE_CDN_ORIGIN = '   '
    expect(getImageCdnOrigin()).toBeNull()
  })
})
