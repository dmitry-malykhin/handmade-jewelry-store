// Serializes `params` into `?a=1&b=2` and skips undefined/null/empty string.
// Empty result → '' (no leading '?') so callers can concatenate unconditionally.
// Generic constraint accepts typed DTO interfaces without needing an index signature.
export function toQueryString<T extends object>(params: T): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}
