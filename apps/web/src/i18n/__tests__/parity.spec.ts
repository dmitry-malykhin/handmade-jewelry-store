import { describe, it, expect } from 'vitest'
import en from '../../../messages/en.json'
import ru from '../../../messages/ru.json'
import es from '../../../messages/es.json'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/i18n')
  await $allureSubSuite('parity')
  await $allureSeverity('normal')
})

type Tree = Record<string, unknown>

function flatten(tree: Tree, prefix = ''): string[] {
  const out: string[] = []
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...flatten(value as Tree, path))
    } else {
      out.push(path)
    }
  }
  return out
}

const enKeys = flatten(en as Tree).sort()
const ruKeys = flatten(ru as Tree).sort()
const esKeys = flatten(es as Tree).sort()

describe('i18n key parity — all locales share the same shape', () => {
  it('en.json and ru.json have identical key sets', () => {
    const onlyInEn = enKeys.filter((k) => !ruKeys.includes(k))
    const onlyInRu = ruKeys.filter((k) => !enKeys.includes(k))
    expect(onlyInEn, 'keys in en.json missing from ru.json').toEqual([])
    expect(onlyInRu, 'keys in ru.json missing from en.json').toEqual([])
  })

  it('en.json and es.json have identical key sets', () => {
    const onlyInEn = enKeys.filter((k) => !esKeys.includes(k))
    const onlyInEs = esKeys.filter((k) => !enKeys.includes(k))
    expect(onlyInEn, 'keys in en.json missing from es.json').toEqual([])
    expect(onlyInEs, 'keys in es.json missing from en.json').toEqual([])
  })

  it('every locale has the same total count', () => {
    expect(ruKeys.length).toBe(enKeys.length)
    expect(esKeys.length).toBe(enKeys.length)
  })

  it('no leaf value is an empty string in any locale', () => {
    const collectEmpty = (tree: Tree, locale: string): string[] => {
      const empties: string[] = []
      for (const path of flatten(tree)) {
        const value = path.split('.').reduce<unknown>((acc, segment) => {
          if (acc && typeof acc === 'object') return (acc as Tree)[segment]
          return undefined
        }, tree)
        if (typeof value === 'string' && value.trim().length === 0) {
          empties.push(`${locale}:${path}`)
        }
      }
      return empties
    }

    expect([
      ...collectEmpty(en as Tree, 'en'),
      ...collectEmpty(ru as Tree, 'ru'),
      ...collectEmpty(es as Tree, 'es'),
    ]).toEqual([])
  })
})

describe('i18n untranslated regression guards (#283)', () => {
  // RU value WAS "Low stock" (English leaked into Russian admin). Must stay Russian.
  it('ru.json admin.inventoryBadgeLowStock is in Russian, not "Low stock"', () => {
    const value = (ru as { admin: { inventoryBadgeLowStock: string } }).admin.inventoryBadgeLowStock
    expect(value).not.toBe('Low stock')
    expect(value).toMatch(/[а-яёА-ЯЁ]/)
  })

  // ES admin tables prefer the localized "Existencias" over English-as-jargon "Stock"
  it('es.json admin.productsColStock is "Existencias", not "Stock"', () => {
    const value = (es as { admin: { productsColStock: string } }).admin.productsColStock
    expect(value).toBe('Existencias')
  })

  // Layout skip-link must read from i18n — regression guard against hardcoded English.
  it('all three locales define header.skipToMain', () => {
    expect((en as { header: { skipToMain: string } }).header.skipToMain).toBeTruthy()
    expect((ru as { header: { skipToMain: string } }).header.skipToMain).toBeTruthy()
    expect((es as { header: { skipToMain: string } }).header.skipToMain).toBeTruthy()
  })
})
