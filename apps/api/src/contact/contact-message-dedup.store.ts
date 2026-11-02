import * as crypto from 'node:crypto'
import { Injectable } from '@nestjs/common'

export const CONTACT_DEDUP_TTL_MS = 60 * 60 * 1000

// A single Fly.io machine serves all contact-form traffic today; a Map is
// enough. When horizontal scale lands (#83 Redis), swap this with a Redis
// SETEX-based implementation behind the same public API.
@Injectable()
export class ContactMessageDedupStore {
  private readonly expiryByKey = new Map<string, number>()
  private readonly ttlMs: number

  constructor(ttlMs: number = CONTACT_DEDUP_TTL_MS) {
    this.ttlMs = ttlMs
  }

  // Normalises case for email + collapses whitespace so trivial variants
  // ("hi  there" vs "hi there") collide — bots padding filler to dodge dedup
  // still land on the same key.
  static fingerprintOf(email: string, subject: string, message: string): string {
    const normalisedEmail = email.trim().toLowerCase()
    const normalisedSubject = subject.trim().replace(/\s+/g, ' ')
    const normalisedMessage = message.trim().replace(/\s+/g, ' ')
    const messageHash = crypto.createHash('sha256').update(normalisedMessage).digest('hex')
    return `${normalisedEmail}:${normalisedSubject}:${messageHash}`
  }

  seenRecently(fingerprint: string, now: number = Date.now()): boolean {
    const expiry = this.expiryByKey.get(fingerprint)
    if (expiry === undefined) return false
    if (expiry <= now) {
      this.expiryByKey.delete(fingerprint)
      return false
    }
    return true
  }

  remember(fingerprint: string, now: number = Date.now()): void {
    this.expiryByKey.set(fingerprint, now + this.ttlMs)
    // Opportunistic sweep: when the map grows past 1024 entries, drop expired
    // keys. Bounds memory under a sustained spam attack without a scheduled
    // interval (which would pin a NodeJS timer alive and prevent clean exit).
    if (this.expiryByKey.size > 1024) {
      for (const [key, keyExpiry] of this.expiryByKey) {
        if (keyExpiry <= now) this.expiryByKey.delete(key)
      }
    }
  }
}
