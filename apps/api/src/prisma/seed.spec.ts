import { PrismaClient } from '@prisma/client'
import {
  hashPasswordForSeed,
  seedCategories,
  seedProducts,
  seedReviews,
  seedUsers,
  seedWishlist,
} from '../../prisma/seed'

// PrismaClient mock must be defined inside the factory to avoid hoisting issues.
// Using a class mock to preserve the prototype chain.
jest.mock('@prisma/client', () => {
  class MockPrismaClient {
    category = { upsert: jest.fn() }
    product = { upsert: jest.fn() }
    user = { upsert: jest.fn() }
    review = { upsert: jest.fn() }
    wishlist = { upsert: jest.fn() }
    $disconnect = jest.fn().mockResolvedValue(undefined)
  }
  return { PrismaClient: MockPrismaClient }
})

function buildMockPrismaClient() {
  return new PrismaClient() as unknown as {
    category: { upsert: jest.Mock }
    product: { upsert: jest.Mock }
    user: { upsert: jest.Mock }
    review: { upsert: jest.Mock }
    wishlist: { upsert: jest.Mock }
  }
}

afterEach(() => {
  jest.clearAllMocks()
})

describe('hashPasswordForSeed', () => {
  it('returns a 64-character hex string for a given input', () => {
    const hashedPassword = hashPasswordForSeed('admin123')
    expect(hashedPassword).toHaveLength(64)
    expect(hashedPassword).toMatch(/^[a-f0-9]+$/)
  })

  it('produces the same hash for the same input (deterministic)', () => {
    const firstHash = hashPasswordForSeed('test123')
    const secondHash = hashPasswordForSeed('test123')
    expect(firstHash).toBe(secondHash)
  })

  it('produces different hashes for different inputs', () => {
    const adminHash = hashPasswordForSeed('admin123')
    const testHash = hashPasswordForSeed('test123')
    expect(adminHash).not.toBe(testHash)
  })
})

describe('seedCategories', () => {
  it('upserts exactly 5 jewelry categories', async () => {
    const mockPrismaClient = buildMockPrismaClient()
    const expectedSlugs = ['rings', 'necklaces', 'bracelets', 'earrings', 'sets']

    expectedSlugs.forEach((slug, index) => {
      mockPrismaClient.category.upsert.mockResolvedValueOnce({ id: `cat-${index}`, slug })
    })

    const categoryMap = await seedCategories(mockPrismaClient as unknown as PrismaClient)

    expect(mockPrismaClient.category.upsert).toHaveBeenCalledTimes(5)
    expectedSlugs.forEach((slug) => {
      expect(mockPrismaClient.category.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug } }),
      )
    })
    expect(Object.keys(categoryMap)).toEqual(expect.arrayContaining(expectedSlugs))
  })
})

describe('seedProducts', () => {
  it('upserts exactly 5 products with correct slugs', async () => {
    const mockPrismaClient = buildMockPrismaClient()
    const categoryMap = {
      rings: { id: 'cat-rings' },
      necklaces: { id: 'cat-necklaces' },
      bracelets: { id: 'cat-bracelets' },
      earrings: { id: 'cat-earrings' },
      sets: { id: 'cat-sets' },
    }
    const expectedSlugs = [
      'sterling-silver-moonstone-ring',
      'beaded-amazonite-bracelet',
      'turquoise-layered-necklace',
      'labradorite-drop-earrings',
      'rose-quartz-jewelry-set',
    ]

    expectedSlugs.forEach((slug, index) => {
      mockPrismaClient.product.upsert.mockResolvedValueOnce({ id: `prod-${index}`, slug })
    })

    const productMap = await seedProducts(mockPrismaClient as unknown as PrismaClient, categoryMap)

    expect(mockPrismaClient.product.upsert).toHaveBeenCalledTimes(5)
    expect(Object.keys(productMap)).toEqual(expect.arrayContaining(expectedSlugs))
  })

  it('includes dimension fields for products that have them', async () => {
    const mockPrismaClient = buildMockPrismaClient()
    const categoryMap = {
      rings: { id: 'cat-rings' },
      necklaces: { id: 'cat-necklaces' },
      bracelets: { id: 'cat-bracelets' },
      earrings: { id: 'cat-earrings' },
      sets: { id: 'cat-sets' },
    }

    mockPrismaClient.product.upsert.mockResolvedValue({ id: 'prod-id', slug: 'any' })

    await seedProducts(mockPrismaClient as unknown as PrismaClient, categoryMap)

    const braceletCall = mockPrismaClient.product.upsert.mock.calls.find(
      (productUpsertCall) => productUpsertCall[0].where.slug === 'beaded-amazonite-bracelet',
    )
    expect(braceletCall?.[0].create.beadSizeMm).toBe(6.0)
    expect(braceletCall?.[0].create.lengthCm).toBe(17.8)

    const necklaceCall = mockPrismaClient.product.upsert.mock.calls.find(
      (productUpsertCall) => productUpsertCall[0].where.slug === 'turquoise-layered-necklace',
    )
    expect(necklaceCall?.[0].create.lengthCm).toBe(45.72)

    const ringCall = mockPrismaClient.product.upsert.mock.calls.find(
      (productUpsertCall) => productUpsertCall[0].where.slug === 'sterling-silver-moonstone-ring',
    )
    expect(ringCall?.[0].create.weightGrams).toBe(4.2)
    expect(ringCall?.[0].create.heightCm).toBe(1.2)
  })

  it('connects each product to the correct category', async () => {
    const mockPrismaClient = buildMockPrismaClient()
    const categoryMap = {
      rings: { id: 'cat-rings' },
      necklaces: { id: 'cat-necklaces' },
      bracelets: { id: 'cat-bracelets' },
      earrings: { id: 'cat-earrings' },
      sets: { id: 'cat-sets' },
    }

    mockPrismaClient.product.upsert.mockResolvedValue({ id: 'prod-id', slug: 'any' })

    await seedProducts(mockPrismaClient as unknown as PrismaClient, categoryMap)

    const ringCall = mockPrismaClient.product.upsert.mock.calls.find(
      (productUpsertCall) => productUpsertCall[0].where.slug === 'sterling-silver-moonstone-ring',
    )
    expect(ringCall?.[0].create.categoryId).toBe('cat-rings')

    const setCall = mockPrismaClient.product.upsert.mock.calls.find(
      (productUpsertCall) => productUpsertCall[0].where.slug === 'rose-quartz-jewelry-set',
    )
    expect(setCall?.[0].create.categoryId).toBe('cat-sets')
  })
})

describe('seedUsers', () => {
  it('upserts admin and test users with correct roles', async () => {
    const mockPrismaClient = buildMockPrismaClient()

    mockPrismaClient.user.upsert
      .mockResolvedValueOnce({ id: 'admin-id', email: 'admin@jewelry.dev', role: 'ADMIN' })
      .mockResolvedValueOnce({ id: 'user-id', email: 'test@jewelry.dev', role: 'USER' })

    const { adminUser, testUser } = await seedUsers(mockPrismaClient as unknown as PrismaClient)

    expect(mockPrismaClient.user.upsert).toHaveBeenCalledTimes(2)
    expect(mockPrismaClient.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'admin@jewelry.dev' },
        create: expect.objectContaining({ role: 'ADMIN' }),
      }),
    )
    expect(mockPrismaClient.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'test@jewelry.dev' },
        create: expect.objectContaining({ role: 'USER' }),
      }),
    )
    expect(adminUser.email).toBe('admin@jewelry.dev')
    expect(testUser.email).toBe('test@jewelry.dev')
  })

  it('stores hashed (not plain-text) passwords for both users', async () => {
    const mockPrismaClient = buildMockPrismaClient()
    mockPrismaClient.user.upsert.mockResolvedValue({ id: 'any-id', email: 'any@jewelry.dev' })

    await seedUsers(mockPrismaClient as unknown as PrismaClient)

    const adminUpsertCall = mockPrismaClient.user.upsert.mock.calls[0][0]
    const testUpsertCall = mockPrismaClient.user.upsert.mock.calls[1][0]

    expect(adminUpsertCall.create.password).not.toBe('admin123')
    expect(testUpsertCall.create.password).not.toBe('test123')
    expect(adminUpsertCall.create.password).toHaveLength(64)
    expect(testUpsertCall.create.password).toHaveLength(64)
  })
})

describe('seedReviews', () => {
  it('upserts 2 reviews for the test user with ratings between 1 and 5', async () => {
    const mockPrismaClient = buildMockPrismaClient()
    mockPrismaClient.review.upsert.mockResolvedValue({ id: 'review-id' })

    const productMap = {
      'sterling-silver-moonstone-ring': { id: 'prod-ring' },
      'beaded-amazonite-bracelet': { id: 'prod-bracelet' },
    }

    await seedReviews(mockPrismaClient as unknown as PrismaClient, 'user-id', productMap)

    expect(mockPrismaClient.review.upsert).toHaveBeenCalledTimes(2)
    mockPrismaClient.review.upsert.mock.calls.forEach((reviewUpsertCall) => {
      const rating = reviewUpsertCall[0].create.rating
      expect(rating).toBeGreaterThanOrEqual(1)
      expect(rating).toBeLessThanOrEqual(5)
    })
  })

  it('uses the userId_productId compound key for upsert uniqueness check', async () => {
    const mockPrismaClient = buildMockPrismaClient()
    mockPrismaClient.review.upsert.mockResolvedValue({ id: 'review-id' })

    const productMap = {
      'sterling-silver-moonstone-ring': { id: 'prod-ring' },
      'beaded-amazonite-bracelet': { id: 'prod-bracelet' },
    }

    await seedReviews(mockPrismaClient as unknown as PrismaClient, 'user-123', productMap)

    mockPrismaClient.review.upsert.mock.calls.forEach((reviewUpsertCall) => {
      expect(reviewUpsertCall[0].where.userId_productId.userId).toBe('user-123')
    })
  })
})

describe('seedWishlist', () => {
  it('upserts a wishlist for the test user with 2 products connected', async () => {
    const mockPrismaClient = buildMockPrismaClient()
    mockPrismaClient.wishlist.upsert.mockResolvedValue({ id: 'wishlist-id' })

    const productMap = {
      'turquoise-layered-necklace': { id: 'prod-necklace' },
      'rose-quartz-jewelry-set': { id: 'prod-set' },
    }

    await seedWishlist(mockPrismaClient as unknown as PrismaClient, 'user-id', productMap)

    expect(mockPrismaClient.wishlist.upsert).toHaveBeenCalledTimes(1)

    const wishlistUpsertCall = mockPrismaClient.wishlist.upsert.mock.calls[0][0]
    expect(wishlistUpsertCall.where).toEqual({ userId: 'user-id' })
    expect(wishlistUpsertCall.create.products.connect).toHaveLength(2)
    expect(wishlistUpsertCall.create.products.connect).toEqual(
      expect.arrayContaining([{ id: 'prod-necklace' }, { id: 'prod-set' }]),
    )
  })
})
