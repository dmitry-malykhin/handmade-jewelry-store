import { describe, it, expect } from 'vitest'
import { pickPublicClientMessages } from '../client-messages'

describe('pickPublicClientMessages (#500)', () => {
  it('drops the admin namespace from the client payload', () => {
    const picked = pickPublicClientMessages({
      header: { title: 'Jewelry' },
      footer: { copyright: '© 2026' },
      admin: { ordersTitle: 'Orders' },
    })
    expect(picked.admin).toBeUndefined()
    expect(picked.header).toEqual({ title: 'Jewelry' })
    expect(picked.footer).toEqual({ copyright: '© 2026' })
  })

  it('keeps all other namespaces untouched (same object references)', () => {
    const header = { title: 'Jewelry' }
    const catalog = { heading: 'All products' }
    const picked = pickPublicClientMessages({ header, catalog, admin: {} })
    expect(picked.header).toBe(header)
    expect(picked.catalog).toBe(catalog)
  })
})
