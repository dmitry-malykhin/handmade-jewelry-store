/**
 * Single source of truth for the canonical site URL.
 *
 * Use this helper for:
 *  - sitemap.xml URL building
 *  - robots.txt sitemap directive
 *  - JSON-LD `url`/`image`/`offers.url` absolute fields
 *  - Google Shopping feed `<g:link>` and `<channel><link>`
 *  - Any future server-side absolute URL emission
 *
 * Why a helper and not `process.env.NEXT_PUBLIC_SITE_URL ?? '...'` inline:
 *  - Five inline copies in sitemap, robots, json-ld, feed, klaviyo client
 *    were trivially identical but easy to fork accidentally — one typo could
 *    publish a wrong domain to crawlers (#284).
 *  - Single fallback `http://localhost:3000` matches the web dev port and
 *    keeps dev sitemap consistent with what the browser hits.
 *  - `metadataBase` in the root layout used a different default
 *    (`https://example.com`) historically — unified here so dev shows real
 *    local URLs and prod always reads from env.
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}
