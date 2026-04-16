const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'cardNumber',
  'cvv',
  'ssn',
  'stripeSecretKey',
  'jwtToken',
  'refreshToken',
  'accessToken',
  'authorization',
]

export function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const result = { ...obj }
  for (const field of SENSITIVE_FIELDS) {
    if (field in result) {
      result[field] = '[REDACTED]'
    }
  }
  return result
}
