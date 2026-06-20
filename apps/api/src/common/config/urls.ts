// Single source of truth for storefront-pointing URLs (CORS, password reset,
// email templates). Inline copies historically diverged (`:3000` vs `:3001`)
// and shipped emails with broken links. Production validation happens once in
// required-env.ts; this helper just reads.
export function getFrontendUrl(): string {
  return process.env.FRONTEND_URL ?? 'http://localhost:3000'
}
