import { describe, it, expect } from 'vitest'
import { highlightMatch } from '../highlight-match'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/search')
  await $allureSubSuite('highlight-match')
  await $allureSeverity('normal')
})

describe('highlightMatch()', () => {
  it('returns a single non-match segment when query is empty', () => {
    expect(highlightMatch('Silver Ring', '')).toEqual([{ text: 'Silver Ring', isMatch: false }])
  })

  it('returns a single non-match segment when text is empty', () => {
    expect(highlightMatch('', 'silver')).toEqual([{ text: '', isMatch: false }])
  })

  it('treats whitespace-only query as empty', () => {
    expect(highlightMatch('Silver Ring', '   ')).toEqual([{ text: 'Silver Ring', isMatch: false }])
  })

  it('matches case-insensitively', () => {
    expect(highlightMatch('Silver Moonstone Ring', 'silver')).toEqual([
      { text: 'Silver', isMatch: true },
      { text: ' Moonstone Ring', isMatch: false },
    ])
  })

  it('preserves the original casing in the match segment', () => {
    expect(highlightMatch('SILVER ring', 'silver')).toEqual([
      { text: 'SILVER', isMatch: true },
      { text: ' ring', isMatch: false },
    ])
  })

  it('produces multiple match segments when query appears more than once', () => {
    expect(highlightMatch('Ring ring RING', 'ring')).toEqual([
      { text: 'Ring', isMatch: true },
      { text: ' ', isMatch: false },
      { text: 'ring', isMatch: true },
      { text: ' ', isMatch: false },
      { text: 'RING', isMatch: true },
    ])
  })

  it('escapes regex special characters in the query', () => {
    // Without escaping `.*` would match the entire title and break the highlight
    expect(highlightMatch('a.b.c', '.')).toEqual([
      { text: 'a', isMatch: false },
      { text: '.', isMatch: true },
      { text: 'b', isMatch: false },
      { text: '.', isMatch: true },
      { text: 'c', isMatch: false },
    ])
  })
})
