import { headers } from 'next/headers'

// Reads the per-request CSP nonce set by middleware. Falls back to empty
// (safe: <script nonce=""> is a valid no-op) when called outside a request
// scope, e.g. in unit tests that render Server Components directly.
export async function readCspNonce(): Promise<string> {
  try {
    return (await headers()).get('x-nonce') ?? ''
  } catch {
    return ''
  }
}
