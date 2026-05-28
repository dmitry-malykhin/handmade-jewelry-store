import { describe, it, expect } from 'vitest'
import { getHelpSlugForPath } from '../path-to-help-slug'

describe('getHelpSlugForPath — products', () => {
  it('maps /admin/products to products/overview', () => {
    expect(getHelpSlugForPath('/admin/products')).toBe('products/overview')
  })

  it('maps /admin/products/new to products/create', () => {
    expect(getHelpSlugForPath('/admin/products/new')).toBe('products/create')
  })

  it('maps /admin/products/:slug/edit to products/edit', () => {
    expect(getHelpSlugForPath('/admin/products/silver-ring/edit')).toBe('products/edit')
  })

  it('maps /admin/inventory to products/inventory', () => {
    expect(getHelpSlugForPath('/admin/inventory')).toBe('products/inventory')
  })
})

describe('getHelpSlugForPath — orders', () => {
  it('maps /admin/orders to orders/overview', () => {
    expect(getHelpSlugForPath('/admin/orders')).toBe('orders/overview')
  })

  it('maps /admin/orders/refunds to orders/refunds (not detail)', () => {
    // Order matters in the route table — specific patterns must beat the
    // dynamic :id pattern. This is the regression we care about.
    expect(getHelpSlugForPath('/admin/orders/refunds')).toBe('orders/refunds')
  })

  it('maps /admin/orders/production to orders/production (not detail)', () => {
    expect(getHelpSlugForPath('/admin/orders/production')).toBe('orders/production')
  })

  it('maps /admin/orders/:id to orders/detail', () => {
    expect(getHelpSlugForPath('/admin/orders/abc-123-uuid')).toBe('orders/detail')
  })
})

describe('getHelpSlugForPath — customers, categories, discounts, settings', () => {
  it('maps /admin/customers to customers/overview', () => {
    expect(getHelpSlugForPath('/admin/customers')).toBe('customers/overview')
  })

  it('maps /admin/customers/:id to customers/profile', () => {
    expect(getHelpSlugForPath('/admin/customers/user-42')).toBe('customers/profile')
  })

  it('maps /admin/categories to categories', () => {
    expect(getHelpSlugForPath('/admin/categories')).toBe('categories')
  })

  it('maps /admin/discounts to discounts/overview', () => {
    expect(getHelpSlugForPath('/admin/discounts')).toBe('discounts/overview')
  })

  it('maps /admin/settings to settings/general', () => {
    expect(getHelpSlugForPath('/admin/settings')).toBe('settings/general')
  })

  it('maps /admin (root) to getting-started', () => {
    expect(getHelpSlugForPath('/admin')).toBe('getting-started')
  })

  it('maps /admin/analytics to analytics', () => {
    expect(getHelpSlugForPath('/admin/analytics')).toBe('analytics')
  })
})

describe('getHelpSlugForPath — unknown paths', () => {
  it('returns null for a non-admin path', () => {
    expect(getHelpSlugForPath('/shop')).toBeNull()
  })

  it('returns null for an unmapped admin subpath', () => {
    expect(getHelpSlugForPath('/admin/reports/sales')).toBeNull()
  })

  it('returns null for trailing-slash variants (paths are normalised by Next.js)', () => {
    // usePathname normalises trailing slashes, so we don't need to handle them
    // here — this test documents the contract.
    expect(getHelpSlugForPath('/admin/orders/')).toBeNull()
  })
})
