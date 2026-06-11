import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../../../../../..')
const appDir = resolve(repoRoot, 'apps/web/src/app/[locale]')

const NAV_FILES = [
  resolve(repoRoot, 'apps/web/src/components/shared/footer.tsx'),
  resolve(repoRoot, 'apps/web/src/components/shared/nav-links.tsx'),
  resolve(repoRoot, 'apps/web/src/components/shared/mobile-nav.tsx'),
]

const KNOWN_DEAD_ROUTES = [
  '/collections',
  '/size-guide',
  // /faq, /shipping, /care — restored in #282 (trust pages live now), so they're
  // no longer dead. Kept the list shape for documentation.
  // /shop family — removed in #280 (catalog moved to /, product detail to /products/[slug]).
  // Direct refs in navigation would hit the 301 redirect chain; block them in source.
  '/shop',
  '/shop/rings',
  '/shop/necklaces',
  '/shop/earrings',
]

function extractHrefLiterals(source: string): string[] {
  // Matches: href: '/path', href: "/path", href="/path"
  const regex = /href\s*[:=]\s*['"](\/[^'"]*)['"]/g
  const hrefs: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(source)) !== null) hrefs.push(match[1]!)
  return hrefs
}

function routeExistsForHref(href: string): boolean {
  // Strip query string and hash — they don't affect routing
  const pathOnly = href.split('?')[0]!.split('#')[0]!
  // Root '/' maps to apps/web/src/app/[locale]/page.tsx
  if (pathOnly === '/' || pathOnly === '') {
    return existsSync(resolve(appDir, 'page.tsx'))
  }
  const segments = pathOnly.replace(/^\//, '').replace(/\/$/, '').split('/')
  // Static route — folder + page.tsx must exist
  const candidate = resolve(appDir, ...segments, 'page.tsx')
  return existsSync(candidate)
}

describe('shared navigation — internal links', () => {
  it.each(NAV_FILES)('every href in %s resolves to an existing route', (file) => {
    const source = readFileSync(file, 'utf8')
    const hrefs = extractHrefLiterals(source)
    expect(hrefs.length).toBeGreaterThan(0)

    const unresolved = hrefs.filter((href) => !routeExistsForHref(href))
    expect(unresolved).toEqual([])
  })

  it.each(NAV_FILES)('%s contains no known dead routes', (file) => {
    const source = readFileSync(file, 'utf8')
    const dead = KNOWN_DEAD_ROUTES.filter((route) => {
      const pattern = new RegExp(`href\\s*[:=]\\s*['"]${route}(['"?#/])`)
      return pattern.test(source)
    })
    expect(dead).toEqual([])
  })

  it('about page declares id="story" so /about#story anchor scrolls correctly', () => {
    const aboutPage = readFileSync(resolve(appDir, 'about/page.tsx'), 'utf8')
    expect(aboutPage).toMatch(/id=['"]story['"]/)
  })

  it('about page uses locale-aware Link import (not next/link directly)', () => {
    const aboutPage = readFileSync(resolve(appDir, 'about/page.tsx'), 'utf8')
    // Block the bare next/link import that breaks locale-prefixed routing on ru/es
    expect(aboutPage).not.toMatch(/from\s+['"]next\/link['"]/)
    expect(aboutPage).toMatch(/from\s+['"]@\/i18n\/navigation['"]/)
  })

  it('placeholder-product.jpg asset is committed', () => {
    const placeholder = resolve(repoRoot, 'apps/web/public/placeholder-product.jpg')
    expect(existsSync(placeholder)).toBe(true)
  })

  it('product detail lives at /products/[slug] (#280)', () => {
    const productPage = resolve(appDir, 'products/[slug]/page.tsx')
    expect(existsSync(productPage)).toBe(true)
  })

  it('next.config declares 301 redirects from old /shop URLs (#280)', () => {
    const config = readFileSync(resolve(repoRoot, 'apps/web/next.config.ts'), 'utf8')
    // Catalog: /:locale/shop → /:locale
    expect(config).toMatch(/source:\s*['"]\/:locale\(en\|ru\|es\)\/shop['"]/)
    expect(config).toMatch(/destination:\s*['"]\/:locale['"]/)
    // Product detail: /:locale/shop/:slug → /:locale/products/:slug
    expect(config).toMatch(/source:\s*['"]\/:locale\(en\|ru\|es\)\/shop\/:slug['"]/)
    expect(config).toMatch(/destination:\s*['"]\/:locale\/products\/:slug['"]/)
    // Both must be permanent (301, not 307)
    const redirectsBlock = config.match(/async redirects\(\)[\s\S]+?^\s{2}\},/m)?.[0] ?? ''
    expect(redirectsBlock).toContain('permanent: true')
  })
})
