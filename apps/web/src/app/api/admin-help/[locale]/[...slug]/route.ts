import { NextResponse } from 'next/server'
import { loadHelpContent } from '@/lib/admin-help/load-help-content'

interface RouteContext {
  params: Promise<{ locale: string; slug: string[] }>
}

/**
 * Serves admin help Markdown content from `docs/admin-help/{locale}/`. Reads
 * disk on each request — dev gets immediate updates without rebuild; in prod
 * the OS page cache keeps reads fast (docs are small, KB-scale).
 *
 * Auth is intentionally NOT enforced here: the content is admin-oriented but
 * not sensitive (no PII, no credentials), and the URL surface area is opaque
 * enough that we don't pay the cost of dragging the JWT pipeline into a
 * static-asset route.
 *
 * Locale resolution: if the requested locale doesn't have the file, the
 * loader falls back to English. 404 fires only when even the English doc
 * is missing — that's the genuine "no help article yet" signal.
 */
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { locale, slug } = await context.params
  const content = await loadHelpContent(locale, slug)

  if (content === null) {
    return NextResponse.json({ error: 'Help document not found' }, { status: 404 })
  }

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  })
}
