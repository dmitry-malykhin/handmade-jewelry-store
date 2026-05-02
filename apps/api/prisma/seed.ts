import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const SEED_BCRYPT_ROUNDS = 10

export async function hashPasswordForSeed(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SEED_BCRYPT_ROUNDS)
}

export async function seedCategories(prisma: PrismaClient) {
  const categoryData = [
    { name: 'Rings', slug: 'rings' },
    { name: 'Necklaces', slug: 'necklaces' },
    { name: 'Bracelets', slug: 'bracelets' },
    { name: 'Earrings', slug: 'earrings' },
    { name: 'Sets', slug: 'sets' },
  ]

  const categories = await Promise.all(
    categoryData.map((category) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        update: {},
        create: category,
      }),
    ),
  )

  return Object.fromEntries(categories.map((category) => [category.slug, category]))
}

export async function seedProducts(
  prisma: PrismaClient,
  categoryMap: Record<string, { id: string }>,
) {
  const productData = [
    {
      title: 'Sterling Silver Moonstone Ring',
      description:
        'Handcrafted sterling silver ring featuring a natural rainbow moonstone. Each stone is unique, making every piece one-of-a-kind. Moonstone is known to promote intuition and balance.',
      price: '68.00',
      // ONE_OF_A_KIND — every moonstone is unique, this exact piece is the one in the photo.
      stock: 1,
      stockType: 'ONE_OF_A_KIND' as const,
      productionDays: 0,
      images: ['https://placehold.co/800x800?text=Moonstone+Ring'],
      slug: 'sterling-silver-moonstone-ring',
      sku: 'RING-001',
      weight: 4.2,
      material: 'Sterling Silver 925, Natural Moonstone',
      widthCm: 0.6, // 6mm band width
      heightCm: 1.2, // 12mm cabochon height
      weightGrams: 4.2,
      categorySlug: 'rings',
    },
    {
      title: 'Beaded Amazonite Bracelet',
      description:
        'Delicate stretch bracelet with 6mm natural amazonite beads and sterling silver spacers. Amazonite is known as the stone of hope and success. One size fits most.',
      price: '34.00',
      // IN_STOCK example — one piece ready to ship today.
      stock: 1,
      stockType: 'IN_STOCK' as const,
      productionDays: 0,
      images: ['https://placehold.co/800x800?text=Amazonite+Bracelet'],
      slug: 'beaded-amazonite-bracelet',
      sku: 'BRAC-001',
      weight: 8.5,
      material: 'Natural Amazonite, Sterling Silver 925',
      lengthCm: 17.8, // 7 inches — standard bracelet length
      weightGrams: 8.5,
      beadSizeMm: 6.0, // as described in product text
      categorySlug: 'bracelets',
    },
    {
      title: 'Turquoise Layered Necklace',
      description:
        'Multi-strand necklace with genuine turquoise chips and 14k gold-filled chain. Adjustable length 16–18 inches. A boho-chic statement piece for everyday wear.',
      price: '89.00',
      // MADE_TO_ORDER example — master crafts a fresh one for each order (5 business days).
      stock: 0,
      stockType: 'MADE_TO_ORDER' as const,
      productionDays: 5,
      images: ['https://placehold.co/800x800?text=Turquoise+Necklace'],
      slug: 'turquoise-layered-necklace',
      sku: 'NECK-001',
      weight: 12.0,
      material: 'Natural Turquoise, 14k Gold-Filled Chain',
      lengthCm: 45.72, // 18 inches (maximum of the 16–18" adjustable range)
      weightGrams: 12.0,
      categorySlug: 'necklaces',
    },
    {
      title: 'Labradorite Drop Earrings',
      description:
        'Elegant drop earrings with natural labradorite cabochons set in sterling silver bezels. The labradorite shows a vivid blue-green flash (labradorescence) in the light.',
      price: '52.00',
      // IN_STOCK example with a finished pair ready to ship.
      stock: 1,
      stockType: 'IN_STOCK' as const,
      productionDays: 0,
      images: ['https://placehold.co/800x800?text=Labradorite+Earrings'],
      slug: 'labradorite-drop-earrings',
      sku: 'EARR-001',
      weight: 3.8,
      material: 'Natural Labradorite, Sterling Silver 925',
      lengthCm: 4.5, // 1.75 inch drop length
      widthCm: 1.5, // 15mm cabochon width
      weightGrams: 3.8,
      categorySlug: 'earrings',
    },
    {
      title: 'Rose Quartz Jewelry Set',
      description:
        'Matching necklace, bracelet, and earrings set with natural rose quartz beads. Rose quartz is the stone of unconditional love. A perfect gift set, comes in a kraft gift box.',
      price: '124.00',
      // MADE_TO_ORDER set — three pieces to assemble, longer lead time (7 business days).
      stock: 0,
      stockType: 'MADE_TO_ORDER' as const,
      productionDays: 7,
      images: ['https://placehold.co/800x800?text=Rose+Quartz+Set'],
      slug: 'rose-quartz-jewelry-set',
      sku: 'SET-001',
      weight: 28.0,
      material: 'Natural Rose Quartz, Sterling Silver 925',
      lengthCm: 45.72, // 18 inch necklace (primary piece of the set)
      weightGrams: 28.0,
      beadSizeMm: 8.0, // 8mm rose quartz beads
      categorySlug: 'sets',
    },
    {
      title: 'Black Onyx Statement Pendant',
      description:
        'A bold statement pendant with a polished black onyx stone in a hand-forged sterling silver bezel. The original stone is gone, but the master can hand-pick a similar onyx and craft a comparable piece on order.',
      price: '94.00',
      // ONE_OF_A_KIND that's been sold — but per #231 still orderable. The master
      // sources a similar (not identical) onyx and recreates the design in 2 days.
      stock: 0,
      stockType: 'ONE_OF_A_KIND' as const,
      productionDays: 2,
      images: ['https://placehold.co/800x800?text=Onyx+Pendant'],
      slug: 'black-onyx-statement-pendant',
      sku: 'PEND-001',
      weight: 6.5,
      material: 'Natural Black Onyx, Sterling Silver 925',
      lengthCm: 3.2, // pendant drop length
      widthCm: 2.0, // bezel width
      weightGrams: 6.5,
      categorySlug: 'necklaces',
    },
  ]

  const products = await Promise.all(
    productData.map(({ categorySlug, ...product }) =>
      prisma.product.upsert({
        where: { slug: product.slug },
        update: {},
        create: {
          ...product,
          price: product.price,
          categoryId: categoryMap[categorySlug].id,
        },
      }),
    ),
  )

  return Object.fromEntries(products.map((product) => [product.slug, product]))
}

export async function seedUsers(prisma: PrismaClient) {
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@jewelry.dev' },
    update: {},
    create: {
      email: 'admin@jewelry.dev',
      password: await hashPasswordForSeed('admin123'),
      role: 'ADMIN',
    },
  })

  const testUser = await prisma.user.upsert({
    where: { email: 'test@jewelry.dev' },
    update: {},
    create: {
      email: 'test@jewelry.dev',
      password: await hashPasswordForSeed('test123'),
      role: 'USER',
    },
  })

  return { adminUser, testUser }
}

export async function seedReviews(
  prisma: PrismaClient,
  testUserId: string,
  productMap: Record<string, { id: string }>,
) {
  const reviewData = [
    {
      rating: 5,
      comment:
        'Absolutely gorgeous ring! The moonstone shimmers beautifully in the light. Packaging was perfect.',
      productSlug: 'sterling-silver-moonstone-ring',
    },
    {
      rating: 5,
      comment:
        'Love this bracelet! It looks exactly like the photos and arrived quickly. Will definitely buy more!',
      productSlug: 'beaded-amazonite-bracelet',
    },
  ]

  await Promise.all(
    reviewData.map((review) =>
      prisma.review.upsert({
        where: {
          userId_productId: {
            userId: testUserId,
            productId: productMap[review.productSlug].id,
          },
        },
        update: {},
        create: {
          rating: review.rating,
          comment: review.comment,
          userId: testUserId,
          productId: productMap[review.productSlug].id,
        },
      }),
    ),
  )
}

/**
 * Seeds a DELIVERED order for the test user containing every product.
 * This satisfies the verified-purchase guard in ReviewsService and makes the
 * "leave a review" flow testable on every product out of the box.
 */
export async function seedTestUserDeliveredOrder(
  prisma: PrismaClient,
  testUserId: string,
  productMap: Record<string, { id: string; price: unknown; title: string; slug: string }>,
) {
  const products = Object.values(productMap)
  const subtotal = products.reduce((sum, product) => sum + Number(product.price), 0)
  const shippingCost = 0
  const total = subtotal + shippingCost

  await prisma.order.upsert({
    where: { id: 'seed-order-test-user-delivered' },
    update: {},
    create: {
      id: 'seed-order-test-user-delivered',
      userId: testUserId,
      status: 'DELIVERED',
      subtotal,
      shippingCost,
      total,
      shippingAddress: {
        fullName: 'Test User',
        addressLine1: '123 Seed St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        country: 'US',
      },
      shippedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      source: 'seed',
      items: {
        create: products.map((product) => ({
          productId: product.id,
          productSnapshot: { title: product.title, slug: product.slug },
          quantity: 1,
          price: product.price as number,
        })),
      },
    },
  })
}

export async function seedWishlist(
  prisma: PrismaClient,
  testUserId: string,
  productMap: Record<string, { id: string }>,
) {
  const wishedProductIds = [
    productMap['turquoise-layered-necklace'].id,
    productMap['rose-quartz-jewelry-set'].id,
  ]

  await prisma.wishlist.upsert({
    where: { userId: testUserId },
    update: {
      products: {
        connect: wishedProductIds.map((productId) => ({ id: productId })),
      },
    },
    create: {
      userId: testUserId,
      products: {
        connect: wishedProductIds.map((productId) => ({ id: productId })),
      },
    },
  })
}

async function main() {
  const prisma = new PrismaClient()

  try {
    console.log('Seeding database...')

    const categoryMap = await seedCategories(prisma)
    console.log(`  ✓ ${Object.keys(categoryMap).length} categories`)

    const productMap = await seedProducts(prisma, categoryMap)
    console.log(`  ✓ ${Object.keys(productMap).length} products`)

    const { adminUser, testUser } = await seedUsers(prisma)
    console.log(`  ✓ 2 users (${adminUser.email}, ${testUser.email})`)

    // Order must be seeded BEFORE reviews — the verified-purchase guard in
    // ReviewsService requires a DELIVERED order to exist for any review.
    await seedTestUserDeliveredOrder(prisma, testUser.id, productMap)
    console.log('  ✓ 1 delivered order for test user (all products)')

    await seedReviews(prisma, testUser.id, productMap)
    console.log('  ✓ 2 reviews')

    await seedWishlist(prisma, testUser.id, productMap)
    console.log('  ✓ 1 wishlist (2 products)')

    console.log('Seeding complete.')
  } finally {
    await prisma.$disconnect()
  }
}

// Only run when executed directly (not when imported in tests)
if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
