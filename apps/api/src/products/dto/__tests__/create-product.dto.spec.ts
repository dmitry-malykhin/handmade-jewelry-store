import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { CreateProductDto } from '../create-product.dto'

// Issue #227 — every handmade piece is unique. Stock is binary, 0 or 1.
// The DTO is the public-facing guard before the database CHECK constraint.
describe('CreateProductDto stock validation', () => {
  function buildDto(stock: number): CreateProductDto {
    return plainToInstance(CreateProductDto, {
      title: 'Sample',
      description: 'A handmade test piece',
      price: 49.99,
      stock,
      images: ['https://example.com/img.jpg'],
      slug: 'sample',
      categoryId: 'cat-1',
    })
  }

  it('accepts stock = 0 (made on order)', async () => {
    const errors = await validate(buildDto(0))
    const stockErrors = errors.filter((error) => error.property === 'stock')
    expect(stockErrors).toHaveLength(0)
  })

  it('accepts stock = 1 (one piece ready)', async () => {
    const errors = await validate(buildDto(1))
    const stockErrors = errors.filter((error) => error.property === 'stock')
    expect(stockErrors).toHaveLength(0)
  })

  it('rejects stock = 2 (handmade pieces are unique)', async () => {
    const errors = await validate(buildDto(2))
    const stockErrors = errors.filter((error) => error.property === 'stock')
    expect(stockErrors.length).toBeGreaterThan(0)
  })

  it('rejects stock = -1 (negative is meaningless)', async () => {
    const errors = await validate(buildDto(-1))
    const stockErrors = errors.filter((error) => error.property === 'stock')
    expect(stockErrors.length).toBeGreaterThan(0)
  })
})
