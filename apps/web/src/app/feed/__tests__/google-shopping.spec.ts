import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetchProducts = vi.fn()
vi.mock('@/lib/api/products', () => ({
  fetchProducts: (...args: unknown[]) => mockFetchProducts(...args),
}))

describe('Google Shopping Feed', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFetchProducts.mockReset()
  })

  it('returns XML with correct content type', async () => {
    mockFetchProducts.mockResolvedValue({ data: [] })

    const { GET } = await import('../google-shopping/route')
    const response = await GET()

    expect(response.headers.get('Content-Type')).toBe('application/xml; charset=utf-8')
  })

  it('returns valid RSS 2.0 with Google namespace', async () => {
    mockFetchProducts.mockResolvedValue({ data: [] })

    const { GET } = await import('../google-shopping/route')
    const response = await GET()
    const xml = await response.text()

    expect(xml).toContain('<?xml version="1.0"')
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"')
    expect(xml).toContain('<channel>')
  })

  it('includes product entries with required Google Shopping fields', async () => {
    mockFetchProducts.mockResolvedValue({
      data: [
        {
          id: 'prod-1',
          title: 'Beaded Bracelet',
          description: 'Handmade bracelet with Czech beads',
          price: '45.00',
          stock: 5,
          images: ['https://cdn.example.com/bracelet.jpg'],
          slug: 'beaded-bracelet',
          sku: 'SKU-001',
          material: 'Czech Glass Beads',
          weightGrams: 25,
          status: 'ACTIVE',
          stockType: 'IN_STOCK',
          category: { name: 'Bracelets', slug: 'bracelets' },
        },
      ],
    })

    const { GET } = await import('../google-shopping/route')
    const response = await GET()
    const xml = await response.text()

    expect(xml).toContain('<g:id>prod-1</g:id>')
    expect(xml).toContain('<g:title>Beaded Bracelet</g:title>')
    expect(xml).toContain('<g:price>45.00 USD</g:price>')
    expect(xml).toContain('<g:availability>in_stock</g:availability>')
    expect(xml).toContain('<g:brand>Senichka</g:brand>')
    expect(xml).toContain('<g:mpn>SKU-001</g:mpn>')
    expect(xml).toContain('<g:material>Czech Glass Beads</g:material>')
    expect(xml).toContain('<g:shipping_weight>25 g</g:shipping_weight>')
    expect(xml).toContain('/en/shop/beaded-bracelet')
  })

  it('filters out non-ACTIVE products', async () => {
    mockFetchProducts.mockResolvedValue({
      data: [
        {
          id: 'draft-1',
          title: 'Draft Product',
          description: 'Not ready',
          price: '10.00',
          stock: 0,
          images: [],
          slug: 'draft',
          sku: null,
          material: null,
          weightGrams: null,
          status: 'DRAFT',
          stockType: 'IN_STOCK',
          category: { name: 'Other', slug: 'other' },
        },
      ],
    })

    const { GET } = await import('../google-shopping/route')
    const response = await GET()
    const xml = await response.text()

    expect(xml).not.toContain('Draft Product')
  })

  it('maps MADE_TO_ORDER to preorder availability', async () => {
    mockFetchProducts.mockResolvedValue({
      data: [
        {
          id: 'mto-1',
          title: 'Custom Necklace',
          description: 'Made to order',
          price: '80.00',
          stock: 0,
          images: ['https://cdn.example.com/necklace.jpg'],
          slug: 'custom-necklace',
          sku: null,
          material: null,
          weightGrams: null,
          status: 'ACTIVE',
          stockType: 'MADE_TO_ORDER',
          category: { name: 'Necklaces', slug: 'necklaces' },
        },
      ],
    })

    const { GET } = await import('../google-shopping/route')
    const response = await GET()
    const xml = await response.text()

    expect(xml).toContain('<g:availability>preorder</g:availability>')
  })

  it('returns empty feed when API is unavailable', async () => {
    mockFetchProducts.mockRejectedValue(new Error('API down'))

    const { GET } = await import('../google-shopping/route')
    const response = await GET()
    const xml = await response.text()

    expect(xml).toContain('<channel>')
    expect(xml).not.toContain('<item>')
  })
})
