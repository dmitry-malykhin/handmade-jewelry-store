import { Test, TestingModule } from '@nestjs/testing'
import type { User } from '@prisma/client'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { MergeWishlistDto } from './dto/merge-wishlist.dto'
import { WishlistController } from './wishlist.controller'
import { WishlistService } from './wishlist.service'

const mockService = {
  getWishlist: jest.fn(),
  mergeGuestWishlist: jest.fn(),
  addToWishlist: jest.fn(),
  removeFromWishlist: jest.fn(),
}

const mockUser = { id: 'u1' } as User

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/wishlist')
  await $allureSubSuite('wishlist.controller')
  await $allureSeverity('normal')
})

describe('WishlistController', () => {
  let controller: WishlistController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WishlistController],
      providers: [{ provide: WishlistService, useValue: mockService }],
    }).compile()
    controller = module.get(WishlistController)
    jest.clearAllMocks()
  })

  it('list() scopes to the current user', async () => {
    mockService.getWishlist.mockResolvedValue([{ id: 'p1' }])

    const result = await controller.list(mockUser)

    expect(mockService.getWishlist).toHaveBeenCalledWith('u1')
    expect(result).toEqual([{ id: 'p1' }])
  })

  it('merge() passes (userId, productIds) extracted from the DTO', async () => {
    const dto: MergeWishlistDto = { productIds: ['p1', 'p2'] }
    mockService.mergeGuestWishlist.mockResolvedValue([])

    await controller.merge(mockUser, dto)

    expect(mockService.mergeGuestWishlist).toHaveBeenCalledWith('u1', ['p1', 'p2'])
  })

  it('add() passes (userId, productId) to addToWishlist', async () => {
    mockService.addToWishlist.mockResolvedValue({ added: true })

    const result = await controller.add(mockUser, 'p1')

    expect(mockService.addToWishlist).toHaveBeenCalledWith('u1', 'p1')
    expect(result.added).toBe(true)
  })

  it('remove() passes (userId, productId) to removeFromWishlist', async () => {
    mockService.removeFromWishlist.mockResolvedValue({ removed: true })

    const result = await controller.remove(mockUser, 'p1')

    expect(mockService.removeFromWishlist).toHaveBeenCalledWith('u1', 'p1')
    expect(result.removed).toBe(true)
  })
})
