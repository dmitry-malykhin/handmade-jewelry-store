import { sanitizeForLog } from '../sanitize-for-log'

describe('sanitizeForLog', () => {
  it('redacts password field', () => {
    const result = sanitizeForLog({ password: 'secret123', email: 'user@example.com' })

    expect(result.password).toBe('[REDACTED]')
    expect(result.email).toBe('user@example.com')
  })

  it('redacts refreshToken field', () => {
    const result = sanitizeForLog({ refreshToken: 'eyJhbGc...', userId: 'abc' })

    expect(result.refreshToken).toBe('[REDACTED]')
    expect(result.userId).toBe('abc')
  })

  it('redacts accessToken field', () => {
    const result = sanitizeForLog({ accessToken: 'token-value' })

    expect(result.accessToken).toBe('[REDACTED]')
  })

  it('redacts jwtToken field', () => {
    const result = sanitizeForLog({ jwtToken: 'eyJ...' })

    expect(result.jwtToken).toBe('[REDACTED]')
  })

  it('redacts cardNumber and cvv fields', () => {
    const result = sanitizeForLog({ cardNumber: '4111111111111111', cvv: '123' })

    expect(result.cardNumber).toBe('[REDACTED]')
    expect(result.cvv).toBe('[REDACTED]')
  })

  it('does not mutate the original object', () => {
    const original = { password: 'secret', name: 'Alice' }
    sanitizeForLog(original)

    expect(original.password).toBe('secret')
  })

  it('leaves non-sensitive fields unchanged', () => {
    const input = { orderId: 'order-1', totalUsd: 99, itemCount: 2 }
    const result = sanitizeForLog(input)

    expect(result).toEqual(input)
  })

  it('handles empty object without errors', () => {
    expect(() => sanitizeForLog({})).not.toThrow()
    expect(sanitizeForLog({})).toEqual({})
  })
})
