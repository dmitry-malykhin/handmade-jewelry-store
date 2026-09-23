import { issueUnsubscribeToken, verifyUnsubscribeToken } from '../unsubscribe-token'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/newsletter')
  await $allureSubSuite('unsubscribe-token')
  await $allureSeverity('critical')
})

describe('unsubscribe token', () => {
  it('issues a token that verifies for the same email', () => {
    const token = issueUnsubscribeToken('user@example.com')
    expect(verifyUnsubscribeToken('user@example.com', token)).toBe(true)
  })

  it('is case-insensitive on the email side', () => {
    const token = issueUnsubscribeToken('user@example.com')
    expect(verifyUnsubscribeToken('USER@example.com', token)).toBe(true)
  })

  it('rejects a token issued for a different email', () => {
    const token = issueUnsubscribeToken('user@example.com')
    expect(verifyUnsubscribeToken('other@example.com', token)).toBe(false)
  })

  it('rejects a truncated token', () => {
    const token = issueUnsubscribeToken('user@example.com')
    expect(verifyUnsubscribeToken('user@example.com', token.slice(0, -1))).toBe(false)
  })

  it('rejects arbitrary strings without any token structure', () => {
    expect(verifyUnsubscribeToken('user@example.com', '')).toBe(false)
    expect(verifyUnsubscribeToken('user@example.com', 'forged-token')).toBe(false)
  })
})
