import 'reflect-metadata'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { CreateOrderDto, OrderItemDto } from '../create-order.dto'

// Issue #227 — every handmade piece is unique. The order DTO must reject:
//   1. quantity > 1 on a single line item
//   2. the same productId appearing twice in items[]
// Both invariants protect the master from impossible commitments at order-create time.

function buildBaseOrder(items: Partial<OrderItemDto>[]): unknown {
  return {
    guestEmail: 'shopper@example.com',
    items: items.map((item) => ({
      productId: 'prod-1',
      quantity: 1,
      price: 49.99,
      productSnapshot: { title: 'Test', slug: 'test' },
      ...item,
    })),
    shippingAddress: {
      fullName: 'Test User',
      addressLine1: '1 Test St',
      city: 'Austin',
      postalCode: '78701',
      country: 'US',
    },
    subtotal: 49.99,
    shippingCost: 0,
    total: 49.99,
  }
}

describe('OrderItemDto quantity validation', () => {
  it('accepts quantity = 1', async () => {
    const dto = plainToInstance(CreateOrderDto, buildBaseOrder([{ quantity: 1 }]))
    const errors = await validate(dto, { skipMissingProperties: false })
    const itemErrors = errors.find((error) => error.property === 'items')
    expect(itemErrors).toBeUndefined()
  })

  it('rejects quantity = 2 on a single line item (handmade pieces are unique)', async () => {
    const dto = plainToInstance(CreateOrderDto, buildBaseOrder([{ quantity: 2 }]))
    const errors = await validate(dto)
    const itemsError = errors.find((error) => error.property === 'items')
    expect(itemsError).toBeDefined()
  })
})

describe('CreateOrderDto unique productIds validation', () => {
  it('accepts an order with two different products', async () => {
    const dto = plainToInstance(
      CreateOrderDto,
      buildBaseOrder([{ productId: 'prod-1' }, { productId: 'prod-2' }]),
    )
    const errors = await validate(dto)
    const itemsError = errors.find(
      (error) => error.property === 'items' && error.constraints?.hasUniqueProductIds,
    )
    expect(itemsError).toBeUndefined()
  })

  it('rejects an order with the same productId in two line items', async () => {
    const dto = plainToInstance(
      CreateOrderDto,
      buildBaseOrder([{ productId: 'prod-1' }, { productId: 'prod-1' }]),
    )
    const errors = await validate(dto)
    const itemsError = errors.find(
      (error) => error.property === 'items' && error.constraints?.hasUniqueProductIds,
    )
    expect(itemsError).toBeDefined()
  })
})
