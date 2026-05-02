import 'reflect-metadata'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { CreateProductDto } from '../create-product.dto'

function buildDto(overrides: Partial<CreateProductDto> = {}): CreateProductDto {
  return plainToInstance(CreateProductDto, {
    title: 'Sample',
    description: 'A handmade test piece',
    price: 49.99,
    stock: 1,
    images: ['https://example.com/img.jpg'],
    slug: 'sample',
    categoryId: 'cat-1',
    ...overrides,
  })
}

// Issue #227 — every handmade piece is unique. Stock is binary, 0 or 1.
describe('CreateProductDto stock validation', () => {
  it('accepts stock = 0 with productionDays >= 1 (made on order)', async () => {
    const errors = await validate(buildDto({ stock: 0, productionDays: 3 }))
    const stockErrors = errors.filter((error) => error.property === 'stock')
    expect(stockErrors).toHaveLength(0)
  })

  it('accepts stock = 1 (one piece ready)', async () => {
    const errors = await validate(buildDto({ stock: 1 }))
    const stockErrors = errors.filter((error) => error.property === 'stock')
    expect(stockErrors).toHaveLength(0)
  })

  it('rejects stock = 2 (handmade pieces are unique)', async () => {
    const errors = await validate(buildDto({ stock: 2 }))
    const stockErrors = errors.filter((error) => error.property === 'stock')
    expect(stockErrors.length).toBeGreaterThan(0)
  })

  it('rejects stock = -1 (negative is meaningless)', async () => {
    const errors = await validate(buildDto({ stock: -1 }))
    const stockErrors = errors.filter((error) => error.property === 'stock')
    expect(stockErrors.length).toBeGreaterThan(0)
  })
})

// Issue #231 — when stock = 0, master MUST commit to a production lead time.
// Otherwise the customer doesn't know what they're waiting for.
describe('CreateProductDto productionDays cross-field validation', () => {
  it('accepts stock = 0 with productionDays = 1', async () => {
    const errors = await validate(buildDto({ stock: 0, productionDays: 1 }))
    const productionErrors = errors.filter((error) => error.property === 'productionDays')
    expect(productionErrors).toHaveLength(0)
  })

  it('accepts stock = 0 with productionDays = 7', async () => {
    const errors = await validate(buildDto({ stock: 0, productionDays: 7 }))
    const productionErrors = errors.filter((error) => error.property === 'productionDays')
    expect(productionErrors).toHaveLength(0)
  })

  it('rejects stock = 0 with productionDays = 0 (no lead time committed)', async () => {
    const errors = await validate(buildDto({ stock: 0, productionDays: 0 }))
    const productionErrors = errors.filter((error) => error.property === 'productionDays')
    expect(productionErrors.length).toBeGreaterThan(0)
  })

  it('rejects stock = 0 with productionDays omitted (undefined)', async () => {
    const errors = await validate(buildDto({ stock: 0 }))
    const productionErrors = errors.filter((error) => error.property === 'productionDays')
    expect(productionErrors.length).toBeGreaterThan(0)
  })

  it('accepts stock = 1 with productionDays = 0 (in stock, no production needed)', async () => {
    const errors = await validate(buildDto({ stock: 1, productionDays: 0 }))
    const productionErrors = errors.filter((error) => error.property === 'productionDays')
    expect(productionErrors).toHaveLength(0)
  })

  it('accepts stock = 1 with productionDays omitted', async () => {
    const errors = await validate(buildDto({ stock: 1 }))
    const productionErrors = errors.filter((error) => error.property === 'productionDays')
    expect(productionErrors).toHaveLength(0)
  })
})
