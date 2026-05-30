import { describe, it, expect } from 'vitest'
import { calculateEstimatedDelivery, formatDeliveryRange } from '../calculate-estimated-delivery'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

// Fixed Monday 2026-03-30 as the base date for deterministic tests
const MONDAY = new Date('2026-03-30T10:00:00.000Z')

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('calculate-estimated-delivery')
  await $allureSeverity('normal')
})

describe('calculateEstimatedDelivery', () => {
  it('adds business days skipping weekends for standard shipping (5–7 days from Monday)', () => {
    const { earliest, latest } = calculateEstimatedDelivery(5, 7, MONDAY)

    // Monday + 5 business days = Monday April 6
    expect(earliest.toDateString()).toBe(new Date('2026-04-06').toDateString())
    // Monday + 7 business days = Wednesday April 8
    expect(latest.toDateString()).toBe(new Date('2026-04-08').toDateString())
  })

  it('adds business days skipping weekends for express shipping (2–3 days from Monday)', () => {
    const { earliest, latest } = calculateEstimatedDelivery(2, 3, MONDAY)

    // Monday + 2 business days = Wednesday April 1
    expect(earliest.toDateString()).toBe(new Date('2026-04-01').toDateString())
    // Monday + 3 business days = Thursday April 2
    expect(latest.toDateString()).toBe(new Date('2026-04-02').toDateString())
  })

  it('skips Saturday and Sunday when starting from Thursday', () => {
    // Thursday 2026-04-02
    const thursday = new Date('2026-04-02T10:00:00.000Z')
    const { earliest } = calculateEstimatedDelivery(2, 2, thursday)

    // Thursday + 2 business days = Monday April 6 (skips Sat+Sun)
    expect(earliest.toDateString()).toBe(new Date('2026-04-06').toDateString())
  })

  it('does not mutate the input date', () => {
    const inputDate = new Date('2026-03-30T10:00:00.000Z')
    const originalTime = inputDate.getTime()

    calculateEstimatedDelivery(5, 7, inputDate)

    expect(inputDate.getTime()).toBe(originalTime)
  })

  it('uses today as default fromDate when not provided', () => {
    const { earliest, latest } = calculateEstimatedDelivery(2, 3)

    expect(earliest).toBeInstanceOf(Date)
    expect(latest).toBeInstanceOf(Date)
    expect(latest.getTime()).toBeGreaterThan(earliest.getTime())
  })
})

describe('formatDeliveryRange', () => {
  it('formats same-month range as "Apr 1–5"', () => {
    const earliest = new Date('2026-04-01')
    const latest = new Date('2026-04-05')

    const result = formatDeliveryRange(earliest, latest)

    expect(result).toBe('Apr 1–5')
  })

  it('formats cross-month range as "Apr 30 – May 2"', () => {
    const earliest = new Date('2026-04-30')
    const latest = new Date('2026-05-02')

    const result = formatDeliveryRange(earliest, latest)

    expect(result).toContain('Apr')
    expect(result).toContain('May')
  })
})
