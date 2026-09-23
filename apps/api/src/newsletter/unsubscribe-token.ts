import { createHmac } from 'node:crypto'

// HMAC-signed token embedded in marketing-email unsubscribe links.
// Kept HMAC (not JWT) because the payload is fixed (email + purpose) and we
// need a stable, short URL: no JSON.parse budget, no expiry to renegotiate.
// The secret is UNSUBSCRIBE_TOKEN_SECRET; when missing, JWT_SECRET is reused
// so dev/test setups keep working. Verified constant-time.

const TOKEN_PURPOSE = 'newsletter-unsubscribe'

function getSecret(): string {
  return process.env.UNSUBSCRIBE_TOKEN_SECRET ?? process.env.JWT_SECRET ?? 'dev-unsubscribe-secret'
}

function sign(email: string): string {
  const payload = `${TOKEN_PURPOSE}:${email.toLowerCase()}`
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function issueUnsubscribeToken(email: string): string {
  return sign(email)
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = sign(email)
  if (expected.length !== token.length) return false
  // constant-time compare via string equality on same-length base64url is fine
  // because the length pre-check + base64url has no timing side channel per byte
  let mismatch = 0
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ token.charCodeAt(index)
  }
  return mismatch === 0
}
