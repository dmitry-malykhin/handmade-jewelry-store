import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'

// bcrypt is a runtime dependency — for seeding we use a deterministic hash
// so developers can log in without installing bcrypt in devDependencies.
// NEVER use this approach outside of seed/test data.
export function hashPasswordForSeed(plainText: string): string {
  return crypto.createHash('sha256').update(plainText).digest('hex')
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
      stock: 5,
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
      stock: 12,
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
      stock: 8,
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
      stock: 7,
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
      stock: 4,
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
      password: hashPasswordForSeed('admin123'),
      role: 'ADMIN',
    },
  })

  const testUser = await prisma.user.upsert({
    where: { email: 'test@jewelry.dev' },
    update: {},
    create: {
      email: 'test@jewelry.dev',
      password: hashPasswordForSeed('test123'),
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
