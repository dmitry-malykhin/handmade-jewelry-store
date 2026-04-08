import { describe, it, expect } from 'vitest'
import {
  generateProductJsonLd,
  generateBreadcrumbJsonLd,
  generateOrganizationJsonLd,
} from '../json-ld'

const baseProduct = {
  title: 'Sterling Silver Moonstone Ring',
  description: 'A beautiful handcrafted ring with natural moonstone.',
  price: '49.99',
  images: ['https://cdn.example.com/ring-1.jpg', 'https://cdn.example.com/ring-2.jpg'],
  slug: 'sterling-silver-moonstone-ring',
  stock: 3,
  material: 'Sterling Silver 925',
  sku: 'SKU-RING-001',
  avgRating: 4.5,
  reviewCount: 12,
}

describe('generateProductJsonLd', () => {
  it('sets correct @context and @type for Schema.org Product', () => {
    const result = generateProductJsonLd(baseProduct)

    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('Product')
  })

  it('maps title, description, images and material correctly', () => {
    const result = generateProductJsonLd(baseProduct)

    expect(result.name).toBe(baseProduct.title)
    expect(result.description).toBe(baseProduct.description)
    expect(result.image).toEqual(baseProduct.images)
    expect(result.material).toBe(baseProduct.material)
  })

  it('includes sku when provided', () => {
    const result = generateProductJsonLd(baseProduct)
    expect(result.sku).toBe('SKU-RING-001')
  })

  it('omits sku when null', () => {
    const result = generateProductJsonLd({ ...baseProduct, sku: null })
    expect(result.sku).toBeUndefined()
  })

  it('sets InStock availability when stock > 0', () => {
    const result = generateProductJsonLd({ ...baseProduct, stock: 1 })
    expect(result.offers.availability).toBe('https://schema.org/InStock')
  })

  it('sets OutOfStock availability when stock is 0', () => {
    const result = generateProductJsonLd({ ...baseProduct, stock: 0 })
    expect(result.offers.availability).toBe('https://schema.org/OutOfStock')
  })

  it('formats price to 2 decimal places in offers', () => {
    const result = generateProductJsonLd({ ...baseProduct, price: '49.9' })
    expect(result.offers.price).toBe('49.90')
  })

  it('sets priceCurrency to USD', () => {
    const result = generateProductJsonLd(baseProduct)
    expect(result.offers.priceCurrency).toBe('USD')
  })

  it('includes aggregateRating when avgRating > 0', () => {
    const result = generateProductJsonLd(baseProduct)

    expect(result.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.5,
      reviewCount: 12,
    })
  })

  it('omits aggregateRating when avgRating is 0', () => {
    const result = generateProductJsonLd({ ...baseProduct, avgRating: 0 })
    expect(result.aggregateRating).toBeUndefined()
  })

  it('builds the product URL using slug', () => {
    const result = generateProductJsonLd(baseProduct)
    expect(result.offers.url).toContain('/shop/sterling-silver-moonstone-ring')
  })
})

describe('generateBreadcrumbJsonLd', () => {
  it('sets correct @context and @type for BreadcrumbList', () => {
    const result = generateBreadcrumbJsonLd([{ name: 'Home', href: '/en' }])

    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('BreadcrumbList')
  })

  it('assigns correct 1-based position to each breadcrumb item', () => {
    const result = generateBreadcrumbJsonLd([
      { name: 'Home', href: '/en' },
      { name: 'Shop', href: '/en/shop' },
      { name: 'Ring', href: '/en/shop/ring' },
    ])

    expect(result.itemListElement[0].position).toBe(1)
    expect(result.itemListElement[1].position).toBe(2)
    expect(result.itemListElement[2].position).toBe(3)
  })

  it('builds full URLs from relative hrefs', () => {
    const result = generateBreadcrumbJsonLd([{ name: 'Shop', href: '/en/shop' }])

    expect(result.itemListElement[0].item).toContain('/en/shop')
  })
})

describe('generateOrganizationJsonLd', () => {
  it('sets correct @context and @type for Organization', () => {
    const result = generateOrganizationJsonLd()

    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('Organization')
  })

  it('sets organization name to Handmade Jewelry Store', () => {
    const result = generateOrganizationJsonLd()
    expect(result.name).toBe('Handmade Jewelry Store')
  })

  it('includes url and logo fields', () => {
    const result = generateOrganizationJsonLd()
    expect(result.url).toBeDefined()
    expect(result.logo).toBeDefined()
    expect(result.logo).toContain('/logo.png')
  })

  it('includes sameAs array', () => {
    const result = generateOrganizationJsonLd()
    expect(Array.isArray(result.sameAs)).toBe(true)
  })
})
