import {
  severity as $allureSeverity,
  subSuite as $allureSubSuite,
  suite as $allureSuite,
} from 'allure-js-commons'
import { CONTACT_DEDUP_TTL_MS, ContactMessageDedupStore } from './contact-message-dedup.store'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/contact')
  await $allureSubSuite('contact-message-dedup.store')
  await $allureSeverity('normal')
})

describe('ContactMessageDedupStore.fingerprintOf', () => {
  it('collides on case-insensitive email and whitespace-normalised body (bot-padding resistant)', () => {
    const a = ContactMessageDedupStore.fingerprintOf(
      'Spammer@Example.COM',
      'Great Offer',
      'Buy now  please',
    )
    const b = ContactMessageDedupStore.fingerprintOf(
      '  spammer@example.com ',
      '  Great Offer  ',
      'Buy   now please',
    )
    expect(a).toBe(b)
  })

  it('differs when email, subject, or message body differ', () => {
    const base = ContactMessageDedupStore.fingerprintOf('a@b.com', 's', 'm')
    expect(ContactMessageDedupStore.fingerprintOf('other@b.com', 's', 'm')).not.toBe(base)
    expect(ContactMessageDedupStore.fingerprintOf('a@b.com', 'other', 'm')).not.toBe(base)
    expect(ContactMessageDedupStore.fingerprintOf('a@b.com', 's', 'other')).not.toBe(base)
  })
})

describe('ContactMessageDedupStore TTL', () => {
  let store: ContactMessageDedupStore

  beforeEach(() => {
    store = new ContactMessageDedupStore(1000)
  })

  it('reports a fresh fingerprint as not-seen', () => {
    expect(store.seenRecently('fp-new')).toBe(false)
  })

  it('reports a remembered fingerprint as seen within TTL', () => {
    store.remember('fp-dup', 10_000)
    expect(store.seenRecently('fp-dup', 10_500)).toBe(true)
  })

  it('evicts expired entries lazily on read (no scheduled interval needed)', () => {
    store.remember('fp-old', 10_000)
    expect(store.seenRecently('fp-old', 10_000 + 1000 + 1)).toBe(false)
    expect(store.seenRecently('fp-old', 10_000 + 1000 + 1)).toBe(false)
  })

  it('default TTL is 1 hour so the spec change surfaces in a code review', () => {
    expect(CONTACT_DEDUP_TTL_MS).toBe(60 * 60 * 1000)
  })
})
