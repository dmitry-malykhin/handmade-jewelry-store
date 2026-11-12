import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  severity as $allureSeverity,
  subSuite as $allureSubSuite,
  suite as $allureSuite,
} from 'allure-js-commons'
import {
  consumeGuestOrderAccessToken,
  peekGuestOrderAccessToken,
  rememberGuestOrderAccessToken,
} from '../order-access-token'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/checkout')
  await $allureSubSuite('order-access-token')
  await $allureSeverity('critical')
})

afterEach(() => {
  window.sessionStorage.clear()
})

describe('rememberGuestOrderAccessToken', () => {
  it('stores the token under an orderId-scoped key', () => {
    rememberGuestOrderAccessToken('order_123', 'signed-token')
    expect(window.sessionStorage.getItem('orderAccessToken:order_123')).toBe('signed-token')
  })

  it('does not collide across parallel checkouts (two orderIds in one tab)', () => {
    rememberGuestOrderAccessToken('order_a', 'tok-a')
    rememberGuestOrderAccessToken('order_b', 'tok-b')
    expect(peekGuestOrderAccessToken('order_a')).toBe('tok-a')
    expect(peekGuestOrderAccessToken('order_b')).toBe('tok-b')
  })

  it('swallows quota / private-mode errors so checkout does not crash', () => {
    const original = window.sessionStorage.setItem
    window.sessionStorage.setItem = () => {
      throw new DOMException('QuotaExceededError')
    }
    expect(() => rememberGuestOrderAccessToken('order_1', 'tok')).not.toThrow()
    window.sessionStorage.setItem = original
  })
})

describe('consumeGuestOrderAccessToken', () => {
  it('reads and removes the token in one shot so Back navigation cannot replay it', () => {
    rememberGuestOrderAccessToken('order_1', 'tok-1')
    expect(consumeGuestOrderAccessToken('order_1')).toBe('tok-1')
    expect(window.sessionStorage.getItem('orderAccessToken:order_1')).toBeNull()
  })

  it('returns null when nothing is stored (no side effect on an empty slot)', () => {
    expect(consumeGuestOrderAccessToken('order_missing')).toBeNull()
  })
})
