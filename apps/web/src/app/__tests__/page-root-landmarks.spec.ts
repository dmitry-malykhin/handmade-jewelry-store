import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const LOCALE_ROOT = resolve(__dirname, '../[locale]')
const PAGE_BASENAMES = new Set(['page.tsx', 'loading.tsx', 'not-found.tsx'])

function walk(dir: string): string[] {
  const entries = readdirSync(dir)
  const out: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) {
      out.push(...walk(full))
    } else if (PAGE_BASENAMES.has(basename(full))) {
      out.push(full)
    }
  }
  return out
}

type RootTag = 'article' | 'section' | 'div' | 'other'

function stripJsxComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function findLastReturnOpening(source: string): string | null {
  const clean = stripJsxComments(source)
  const marker = /\breturn\s*\(\s*/g
  let last: RegExpExecArray | null = null
  let match: RegExpExecArray | null
  while ((match = marker.exec(clean)) !== null) last = match
  if (!last) return null
  return clean.slice(last.index + last[0].length).trimStart()
}

function pickRootTag(afterReturn: string): { tag: RootTag; openTag: string } {
  const openMatch = /^<([A-Za-z][A-Za-z0-9]*)([^>]*)>/.exec(afterReturn)
  if (!openMatch || !openMatch[1]) return { tag: 'other', openTag: '' }
  const name = openMatch[1].toLowerCase()
  const tag: RootTag =
    name === 'article'
      ? 'article'
      : name === 'section'
        ? 'section'
        : name === 'div'
          ? 'div'
          : 'other'
  return { tag, openTag: openMatch[0] }
}

function hasAccessibleName(openTag: string): boolean {
  return /\baria-labelledby=|\baria-label=/.test(openTag)
}

describe('page-root landmarks (#633)', () => {
  const files = walk(LOCALE_ROOT)

  it('finds every page file', () => {
    expect(files.length).toBeGreaterThan(30)
  })

  for (const file of files) {
    const rel = relative(LOCALE_ROOT, file)
    it(`${rel}: root is <article> or <section> with an accessible name`, () => {
      const source = readFileSync(file, 'utf8')
      const afterReturn = findLastReturnOpening(source)
      if (afterReturn === null) {
        expect.fail(`${rel}: no return(...) found`)
      }

      const { tag, openTag } = pickRootTag(afterReturn)

      if (tag === 'div') {
        expect.fail(
          `${rel}: page root is <div> — must be <article> for standalone-doc pages or <section aria-labelledby|aria-label> for UI pages`,
        )
      }

      if (tag === 'section') {
        expect(
          hasAccessibleName(openTag),
          `${rel}: <section> missing aria-labelledby or aria-label`,
        ).toBe(true)
      }
    })
  }
})
