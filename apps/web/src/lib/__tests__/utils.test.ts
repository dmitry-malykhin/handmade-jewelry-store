import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn()', () => {
  it('returns a single class name unchanged', () => {
    expect(cn('px-4')).toBe('px-4')
  })

  it('merges multiple class names into one string', () => {
    expect(cn('px-4', 'py-2', 'rounded')).toBe('px-4 py-2 rounded')
  })

  it('resolves Tailwind conflicts — the last value wins', () => {
    // tailwind-merge: px-8 overrides px-4
    expect(cn('px-4', 'px-8')).toBe('px-8')
  })

  it('resolves multiple conflicting utilities', () => {
    expect(cn('text-sm', 'font-bold', 'text-lg')).toBe('font-bold text-lg')
  })

  it('drops false values', () => {
    expect(cn('px-4', false, 'py-2')).toBe('px-4 py-2')
  })

  it('drops undefined values', () => {
    expect(cn('px-4', undefined, 'py-2')).toBe('px-4 py-2')
  })

  it('drops null values', () => {
    expect(cn('px-4', null, 'py-2')).toBe('px-4 py-2')
  })

  it('handles conditional class with ternary', () => {
    const isActive = true
    expect(cn('base', isActive ? 'active' : 'inactive')).toBe('base active')
  })

  it('handles conditional class that evaluates to false', () => {
    const isActive = false
    expect(cn('base', isActive && 'active')).toBe('base')
  })

  it('returns empty string when all arguments are falsy', () => {
    expect(cn(false, undefined, null)).toBe('')
  })
})
