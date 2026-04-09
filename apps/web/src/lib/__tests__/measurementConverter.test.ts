import { describe, it, expect } from 'vitest'
import { convertLength, convertDimensions } from '@jewelry/shared'

describe('convertLength — metric system', () => {
  it('returns rounded cm with 1 decimal place', () => {
    const result = convertLength(45.72, 'metric')

    expect(result.value).toBe(45.7)
    expect(result.unit).toBe('cm')
    expect(result.formatted).toBe('45.7 cm')
  })

  it('returns whole cm without decimal when value is round', () => {
    const result = convertLength(45.0, 'metric')

    expect(result.value).toBe(45)
    expect(result.formatted).toBe('45 cm')
  })

  it('rounds 2.55 cm to 2.6 cm', () => {
    expect(convertLength(2.55, 'metric').value).toBe(2.6)
  })
})

describe('convertLength — imperial system', () => {
  it('converts a standard necklace length: 45.72 cm → 18"', () => {
    const result = convertLength(45.72, 'imperial')

    // 45.72 cm × 0.393701 = 18.0 inches (exact)
    expect(result.value).toBe(18)
    expect(result.unit).toBe('in')
    expect(result.formatted).toBe('18"')
  })

  it('rounds to nearest 0.25 inch (jewelry industry standard)', () => {
    // 42.0 cm × 0.393701 = 16.535 → rounds to 16.5"
    expect(convertLength(42.0, 'imperial').value).toBe(16.5)
  })

  it('converts 43.18 cm → 17"', () => {
    // 43.18 cm × 0.393701 = 17.0 inches
    expect(convertLength(43.18, 'imperial').value).toBe(17)
  })

  it('converts 17.78 cm → 7"', () => {
    // 17.78 cm × 0.393701 = 7.0 inches
    expect(convertLength(17.78, 'imperial').value).toBe(7)
  })

  it('converts small pendant: 3 cm → nearest 0.25"', () => {
    // 3 cm × 0.393701 = 1.181 → rounds to 1.25"
    expect(convertLength(3, 'imperial').value).toBe(1.25)
  })
})

describe('convertDimensions', () => {
  it('returns metric formatted string for metric system', () => {
    expect(convertDimensions(3, 2, 'metric')).toBe('3 × 2 cm')
  })

  it('returns imperial formatted string for imperial system', () => {
    // 3 cm = 1.18 in, 2 cm = 0.79 in
    expect(convertDimensions(3, 2, 'imperial')).toBe('1.18 × 0.79"')
  })
})
