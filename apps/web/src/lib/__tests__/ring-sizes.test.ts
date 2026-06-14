import { describe, it, expect } from 'vitest'
import { RING_SIZES, findUsSizeByDiameter } from '../ring-sizes'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/__tests__')
  await $allureSubSuite('ring-sizes')
  await $allureSeverity('normal')
})

describe('RING_SIZES table integrity', () => {
  it('contains 19 entries covering US 4–13 in 0.5 increments', () => {
    expect(RING_SIZES).toHaveLength(19)
    expect(RING_SIZES[0]!.us).toBe(4)
    expect(RING_SIZES[RING_SIZES.length - 1]!.us).toBe(13)
  })

  it('is sorted ascending by US size', () => {
    for (let i = 1; i < RING_SIZES.length; i += 1) {
      expect(RING_SIZES[i]!.us).toBeGreaterThan(RING_SIZES[i - 1]!.us)
    }
  })

  it('has strictly increasing diameter — guarantees the lookup is monotonic', () => {
    for (let i = 1; i < RING_SIZES.length; i += 1) {
      expect(RING_SIZES[i]!.diameterMm).toBeGreaterThan(RING_SIZES[i - 1]!.diameterMm)
    }
  })

  it('every row has all four required fields populated', () => {
    for (const size of RING_SIZES) {
      expect(typeof size.us).toBe('number')
      expect(size.uk.length).toBeGreaterThan(0)
      expect(size.eu).toBeGreaterThan(0)
      expect(size.diameterMm).toBeGreaterThan(0)
    }
  })
})

describe('findUsSizeByDiameter()', () => {
  it('returns the exact match when diameter aligns with a row', () => {
    expect(findUsSizeByDiameter(15.7)).toBe(5)
    expect(findUsSizeByDiameter(17.32)).toBe(7)
  })

  it('rounds to the closest standard size when between rows', () => {
    // 17.0 mm is between US 6.5 (16.92) and US 7 (17.32) — closer to 6.5
    expect(findUsSizeByDiameter(17.0)).toBe(6.5)
    // 17.2 mm is closer to US 7 (17.32) than 6.5 (16.92)
    expect(findUsSizeByDiameter(17.2)).toBe(7)
  })

  it('returns null for diameters outside the standard range', () => {
    expect(findUsSizeByDiameter(10)).toBeNull() // tiny — below US 4
    expect(findUsSizeByDiameter(30)).toBeNull() // huge — above US 13
  })

  it('accepts diameters slightly outside the table range (within tolerance)', () => {
    // Tolerance is 0.4mm — 14.5mm is ~0.36mm below the smallest entry.
    expect(findUsSizeByDiameter(14.5)).toBe(4)
  })
})
