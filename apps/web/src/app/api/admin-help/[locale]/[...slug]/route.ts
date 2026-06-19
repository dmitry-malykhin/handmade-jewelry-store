import { NextResponse } from 'next/server'
import { loadHelpContent } from '@/lib/admin-help/load-help-content'

interface RouteContext {
  params: Promise<{ locale: string; slug: string[] }>
}

// Auth is intentionally NOT enforced — content is admin-oriented but not
// sensitive (no PII, no credentials), and the URL surface is opaque.
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
