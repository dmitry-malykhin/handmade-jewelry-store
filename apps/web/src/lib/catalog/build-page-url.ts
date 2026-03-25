/**
 * Builds a paginated URL for the catalog by merging active filter params with the target page.
 * Page 1 is canonical — no ?page= param (prevents duplicate content for SEO).
 */
export function buildPageUrl(searchParams: Record<string, string>, targetPage: number): string {
  const params = new URLSearchParams(searchParams)
  if (targetPage === 1) {
    params.delete('page')
  } else {
    params.set('page', String(targetPage))
  }
  const query = params.toString()
  return `/shop${query ? `?${query}` : ''}`
}
