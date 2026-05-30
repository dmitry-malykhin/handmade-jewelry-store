#!/usr/bin/env node
// One-shot codemod that annotates every test file with Allure metadata
// (suite, subSuite, severity). Idempotent — files already containing the
// allure marker are left alone. Run from the repo root:
//   node scripts/annotate-tests-for-allure.mjs
//
// Insertion strategy:
//  - The import is added at the end of the existing import block (so it
//    obeys "imports first").
//  - The `beforeEach(...)` hook is inserted right before the first
//    `describe(`/`test(`/`it(` call so vi.mock() / fixture constants stay
//    above it, matching how the rest of the codebase is laid out.
//  - Vitest + Jest share the global `beforeEach`; Playwright tests use
//    `test.beforeEach`. We detect by path.

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const REPO_ROOT = process.cwd()
const TEST_FILE_REGEX = /\.(spec|test)\.tsx?$/
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage', '.git'])
const ALLURE_MARKER = '$allureSuite'

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) walk(fullPath, acc)
    else if (stat.isFile() && TEST_FILE_REGEX.test(entry)) acc.push(fullPath)
  }
  return acc
}

function classify(filePath) {
  const rel = relative(REPO_ROOT, filePath)
  if (rel.startsWith(`apps${sep}web${sep}tests${sep}e2e${sep}`)) return 'playwright'
  if (rel.startsWith(`apps${sep}web${sep}`)) return 'vitest'
  if (rel.startsWith(`apps${sep}api${sep}`)) return 'jest'
  return null
}

function suiteFor(filePath, kind) {
  const rel = relative(REPO_ROOT, filePath)
  const parts = rel.split(sep)
  if (kind === 'playwright') return 'e2e'
  if (kind === 'jest') {
    const moduleDir = parts[3] ?? 'misc'
    return `api/${moduleDir}`
  }
  const srcIdx = parts.indexOf('src')
  const top = parts[srcIdx + 1] ?? 'misc'
  const sub = parts[srcIdx + 2] ?? ''
  const suite = sub ? `web/${top}/${sub}` : `web/${top}`
  return suite.replace(/[[\]]/g, '')
}

function subSuiteFor(filePath) {
  const file = filePath.split(sep).pop() ?? ''
  return file.replace(/\.(spec|test)\.tsx?$/, '')
}

const IMPORT_LINE =
  "import { suite as $allureSuite, subSuite as $allureSubSuite, severity as $allureSeverity } from 'allure-js-commons'"

function buildHook(kind, suite, subSuite) {
  const hookOpen =
    kind === 'playwright' ? 'test.beforeEach(async () => {' : 'beforeEach(async () => {'
  // The early return keeps the local test output clean — Allure reporters
  // only attach to the test runner on CI, and calling the runtime API
  // without an attached reporter logs "no test runtime is found" on every
  // hook invocation.
  return `${hookOpen}\n  if (!process.env.CI) return\n  await $allureSuite('${suite}')\n  await $allureSubSuite('${subSuite}')\n  await $allureSeverity('normal')\n})`
}

/**
 * Returns the index of the line that comes immediately after the file's
 * import block. Handles multi-line imports.
 */
function findEndOfImports(lines) {
  let lastImportLine = -1
  let inMultiLineImport = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (inMultiLineImport) {
      lastImportLine = i
      if (/from\s+['"]/.test(line)) inMultiLineImport = false
      continue
    }
    if (/^import\s/.test(line)) {
      lastImportLine = i
      if (line.includes('{') && !line.includes('}') && !line.includes('from ')) {
        inMultiLineImport = true
      } else if (
        !/from\s+['"]/.test(line) &&
        !line.trim().endsWith(';') &&
        !line.trim().endsWith('"') &&
        !line.trim().endsWith("'")
      ) {
        // bare-side-effect import like `import './x'` — already complete
      }
    }
  }
  return lastImportLine + 1
}

/**
 * Returns the index of the first top-level test definition. Falls back to
 * end of file when none is found (codemod will be a no-op in that case).
 */
function findFirstDescribe(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (/^(describe|test|it)\s*\(/.test(lines[i])) return i
  }
  return -1
}

const files = walk(REPO_ROOT)
let modified = 0
let skippedAlready = 0
let skippedNoTopDescribe = 0

for (const file of files) {
  const kind = classify(file)
  if (!kind) continue
  const content = readFileSync(file, 'utf8')
  if (content.includes(ALLURE_MARKER)) {
    skippedAlready++
    continue
  }
  const lines = content.split('\n')
  const firstDescribe = findFirstDescribe(lines)
  if (firstDescribe === -1) {
    skippedNoTopDescribe++
    continue
  }
  const endOfImports = findEndOfImports(lines)
  if (endOfImports > firstDescribe) {
    skippedNoTopDescribe++
    continue
  }

  const suite = suiteFor(file, kind)
  const subSuite = subSuiteFor(file)
  const hook = buildHook(kind, suite, subSuite)

  // Insert the hook FIRST (later index), then the import. Order matters
  // because inserting at lower index shifts higher indices.
  const newLines = [...lines]
  newLines.splice(firstDescribe, 0, hook, '')
  newLines.splice(endOfImports, 0, IMPORT_LINE)
  writeFileSync(file, newLines.join('\n'))
  modified++
}

console.log(`Modified: ${modified}`)
console.log(`Already annotated: ${skippedAlready}`)
console.log(`Skipped (no top-level describe/test): ${skippedNoTopDescribe}`)
