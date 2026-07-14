// Origin used to preconnect before LCP images are fetched (R2 / S3 / CDN host).
// Returns null when unset — caller skips the <link rel="preconnect"> tag
// instead of emitting one for the seed's placehold.co placeholder.
export function getImageCdnOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_IMAGE_CDN_ORIGIN?.trim()
  return raw && raw !== '' ? raw : null
}
