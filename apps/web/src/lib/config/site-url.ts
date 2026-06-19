// Single source of truth for any server-side absolute URL emission
// (sitemap, robots, JSON-LD, feed, metadataBase). Inline copies kept drifting.
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}
