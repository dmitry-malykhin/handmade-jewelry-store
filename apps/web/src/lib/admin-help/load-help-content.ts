import { existsSync, promises as fs } from 'fs'
import path from 'path'

// Path traversal guard — slug comes from the URL, sanitise every segment.
const VALID_SEGMENT_PATTERN = /^[a-z0-9-]+$/

export const SUPPORTED_HELP_LOCALES = ['en', 'ru', 'es'] as const
export type HelpLocale = (typeof SUPPORTED_HELP_LOCALES)[number]

const FALLBACK_LOCALE: HelpLocale = 'en'

function isValidSegment(segment: string): boolean {
  return VALID_SEGMENT_PATTERN.test(segment)
}

function isHelpLocale(value: string): value is HelpLocale {
  return (SUPPORTED_HELP_LOCALES as readonly string[]).includes(value)
}

// CWD-relative (not __dirname) — Next.js bundles server code into .next/server,
// so the source-relative __dirname doesn't point at the original file.
function findRepoRoot(startDir: string): string | null {
  let current = path.resolve(startDir)
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current
    const parent = path.dirname(current)
    if (parent === current) return null
    current = parent
  }
}

// Returns null on invalid slug or unsupported locale so the Route Handler can
// 404 without touching the filesystem.
export function resolveHelpDocPath(locale: string, slugSegments: string[]): string | null {
  if (!isHelpLocale(locale)) return null
  if (slugSegments.length === 0) return null
  if (!slugSegments.every(isValidSegment)) return null

  const repoRoot = findRepoRoot(process.cwd())
  if (!repoRoot) return null

  const helpDocsRoot = path.join(repoRoot, 'docs', 'admin-help', locale)
  return path.join(helpDocsRoot, ...slugSegments) + '.md'
}

async function readIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

// Falls back to English. Returns null only when the English fallback is also
// missing — the genuine "no help article" signal the drawer renders.
export async function loadHelpContent(
  locale: string,
  slugSegments: string[],
): Promise<string | null> {
  const localePath = resolveHelpDocPath(locale, slugSegments)
  if (localePath) {
    const localized = await readIfExists(localePath)
    if (localized !== null) return localized
  }

  if (locale === FALLBACK_LOCALE) return null

  const fallbackPath = resolveHelpDocPath(FALLBACK_LOCALE, slugSegments)
  if (!fallbackPath) return null
  return readIfExists(fallbackPath)
}
