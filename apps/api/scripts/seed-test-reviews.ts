/**
 * One-off script to seed reviews with varied statuses for local moderation
 * testing (#165). Bypasses the verified-purchase check in ReviewsService by
 * writing through Prisma directly.
 *
 * Run with:
 *   pnpm --filter @jewelry/api exec ts-node scripts/seed-test-reviews.ts
 *
 * Idempotency: deterministic IDs (`seed-review-test-<n>`) upsert in place.
 */
import { PrismaClient, ReviewStatus } from '@prisma/client'

const prisma = new PrismaClient()

interface ReviewSpec {
  id: string
  rating: number
  comment: string
  status: ReviewStatus
  sellerReply?: string
}

const REVIEWS: readonly ReviewSpec[] = [
  {
    id: 'seed-review-test-1',
    rating: 5,
    comment:
      'Absolutely stunning piece! The craftsmanship is exceptional and the colors are even more vibrant in person.',
    status: ReviewStatus.PENDING,
  },
  {
    id: 'seed-review-test-2',
    rating: 1,
    comment: 'Buy now!!! Limited time offer at competitor-spam-site.example',
    status: ReviewStatus.PENDING,
  },
  {
    id: 'seed-review-test-3',
    rating: 4,
    comment: 'Beautiful but smaller than I expected. Still very happy with my purchase.',
    status: ReviewStatus.APPROVED,
  },
  {
    id: 'seed-review-test-4',
    rating: 2,
    comment: 'Arrived damaged — the clasp was broken.',
    status: ReviewStatus.APPROVED,
    sellerReply:
      'We are so sorry to hear about the damage! We have shipped a replacement piece overnight and added a small token of apology. Please reach out if anything else is needed.',
  },
  {
    id: 'seed-review-test-5',
    rating: 1,
    comment: 'asdfasdf totally unrelated text from a bot',
    status: ReviewStatus.HIDDEN,
  },
]

async function main(): Promise<void> {
  const testUser = await prisma.user.findUnique({ where: { email: 'test@jewelry.dev' } })
  if (!testUser) {
    throw new Error('Run `pnpm --filter @jewelry/api db:seed` first — test user is missing.')
  }

  const products = await prisma.product.findMany({ take: REVIEWS.length })
  if (products.length < REVIEWS.length) {
    throw new Error(
      `Need at least ${REVIEWS.length} products in DB. Run \`pnpm --filter @jewelry/api db:seed\` first.`,
    )
  }

  // Deactivate the @@unique([userId, productId]) constraint by spreading
  // reviews across different products — one review per (user, product) pair.
  let createdCount = 0
  let updatedCount = 0

  for (let index = 0; index < REVIEWS.length; index += 1) {
    const spec = REVIEWS[index] as ReviewSpec
    const product = products[index] as (typeof products)[0]

    const existing = await prisma.review.findUnique({ where: { id: spec.id } })

    await prisma.review.upsert({
      where: { id: spec.id },
      create: {
        id: spec.id,
        userId: testUser.id,
        productId: product.id,
        rating: spec.rating,
        comment: spec.comment,
        status: spec.status,
        ...(spec.sellerReply && {
          sellerReply: spec.sellerReply,
          sellerRepliedAt: new Date(),
        }),
      },
      update: {
        rating: spec.rating,
        comment: spec.comment,
        status: spec.status,
        sellerReply: spec.sellerReply ?? null,
        sellerRepliedAt: spec.sellerReply ? new Date() : null,
      },
    })

    if (existing) updatedCount += 1
    else createdCount += 1
  }

  // Recompute aggregates for every touched product so the public catalog
  // reflects what's now APPROVED.
  const touchedProductIds = products.slice(0, REVIEWS.length).map((p) => p.id)
  for (const productId of touchedProductIds) {
    const aggregate = await prisma.review.aggregate({
      where: { productId, status: ReviewStatus.APPROVED },
      _avg: { rating: true },
      _count: true,
    })
    await prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: aggregate._avg.rating ?? 0,
        reviewCount: aggregate._count,
      },
    })
  }

  console.log(`✓ Test reviews ready — ${createdCount} created, ${updatedCount} updated.`)
  console.log(`  Statuses: 2 PENDING, 2 APPROVED (1 with seller reply), 1 HIDDEN`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
