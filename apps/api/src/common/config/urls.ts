/**
 * Single source of truth for outgoing URLs that point back at the storefront.
 *
 * Use this helper for:
 *  - CORS origins (main.ts)
 *  - Password reset links (auth)
 *  - Transactional email bodies (Resend templates)
 *  - Any future server-side reference to the customer site
 *
 * Why a helper and not `process.env.FRONTEND_URL ?? '...'` inline:
 *  - Inline reads diverged historically — auth + email templates defaulted to
 *    `:3001` (wrong port) while main.ts defaulted to `:3000`. A localhost
 *    typo in production would have shipped emails with broken links (#284).
 *  - Production validation (require `FRONTEND_URL` set, refuse localhost) is
 *    enforced once in `required-env.ts` at startup. Helpers stay simple
 *    readers — never re-validate per call.
 *  - Fallback is the WEB dev port (`localhost:3000`). API itself runs on
 *    `:4000` and never refers to itself with this helper.
 */
export function getFrontendUrl(): string {
  return process.env.FRONTEND_URL ?? 'http://localhost:3000'
}
