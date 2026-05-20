/**
 * One-off script to seed guest orders with varied statuses + addresses for
 * local CSV-export testing. Run with:
 *
 *   pnpm --filter @jewelry/api exec ts-node scripts/seed-test-orders.ts
 *
 * Idempotency: each order has a deterministic ID (`seed-csv-test-<n>`), so
 * re-running upserts in place instead of duplicating rows.
 */
import { OrderStatus, PrismaClient, type Prisma } from '@prisma/client'

const prisma = new PrismaClient()

interface OrderSpec {
  id: string
  guestEmail: string
  fullName: string
  city: string
  state: string
  status: OrderStatus
  trackingNumber: string | null
  daysAgo: number
}

const ORDERS: readonly OrderSpec[] = [
  {
    id: 'seed-csv-test-1',
    guestEmail: 'alice@example.com',
    fullName: 'Alice Walker',
    city: 'Brooklyn',
    state: 'NY',
    status: OrderStatus.PENDING,
    trackingNumber: null,
    daysAgo: 0,
  },
  {
    id: 'seed-csv-test-2',
    guestEmail: 'bob@example.com',
    fullName: 'Bob, Jr.', // comma in name → tests CSV escaping
    city: 'Austin',
    state: 'TX',
    status: OrderStatus.PAID,
    trackingNumber: null,
    daysAgo: 1,
  },
  {
    id: 'seed-csv-test-3',
    guestEmail: 'clara@example.com',
    fullName: 'Clara Žižek', // non-ASCII → tests UTF-8 encoding
    city: 'San Francisco',
    state: 'CA',
    status: OrderStatus.SHIPPED,
    trackingNumber: '9400111899223481750000',
    daysAgo: 3,
  },
  {
    id: 'seed-csv-test-4',
    guestEmail: 'dmitri@example.com',
    fullName: 'Дмитрий Петров', // Cyrillic → BOM-less UTF-8 sanity
    city: 'Seattle',
    state: 'WA',
    status: OrderStatus.DELIVERED,
    trackingNumber: '1Z999AA10123456784',
    daysAgo: 7,
  },
  {
    id: 'seed-csv-test-5',
    guestEmail: 'eve@example.com',
    fullName: 'Eve "Hawk" Lee', // quotes → CSV double-quote escaping
    city: 'Boston',
    state: 'MA',
    status: OrderStatus.CANCELLED,
    trackingNumber: null,
    daysAgo: 14,
  },
]

async function main(): Promise<void> {
  // Grab two products to assemble line items — keeps the script resilient
  // across local DBs as long as `pnpm db:seed` has been run at least once.
  const products = await prisma.product.findMany({ take: 2 })
  if (products.length < 2) {
    throw new Error(
      'Need at least 2 products in DB. Run `pnpm --filter @jewelry/api db:seed` first.',
    )
  }
  const [firstProduct, secondProduct] = products as [(typeof products)[0], (typeof products)[0]]

  let createdCount = 0
  let updatedCount = 0

  for (const spec of ORDERS) {
    const createdAt = new Date(Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000)
    const shippingAddress = {
      fullName: spec.fullName,
      addressLine1: '123 Demo Street',
      addressLine2: spec.id === 'seed-csv-test-2' ? 'Apt #4B' : undefined,
      city: spec.city,
      state: spec.state,
      postalCode: '10001',
      country: 'US',
    }
    // 2× product 1 + 1× product 2 — exercises the items-formatter cell.
    const lineItems = [
      {
        productId: firstProduct.id,
        quantity: 2,
        price: firstProduct.price,
        productSnapshot: { title: firstProduct.title, slug: firstProduct.slug },
      },
      {
        productId: secondProduct.id,
        quantity: 1,
        price: secondProduct.price,
        productSnapshot: { title: secondProduct.title, slug: secondProduct.slug },
      },
    ]
    const subtotal = firstProduct.price.toNumber() * 2 + secondProduct.price.toNumber()
    const shippingCost = 7.5
    const total = subtotal + shippingCost

    const existing = await prisma.order.findUnique({ where: { id: spec.id } })

    await prisma.order.upsert({
      where: { id: spec.id },
      create: {
        id: spec.id,
        guestEmail: spec.guestEmail,
        status: spec.status,
        subtotal,
        shippingCost,
        total,
        shippingAddress: shippingAddress as Prisma.InputJsonValue,
        trackingNumber: spec.trackingNumber,
        source: 'web',
        createdAt,
        items: { create: lineItems },
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: spec.status,
            createdBy: 'seed-csv-test',
          },
        },
      },
      update: {
        status: spec.status,
        trackingNumber: spec.trackingNumber,
        shippingAddress: shippingAddress as Prisma.InputJsonValue,
      },
    })

    if (existing) updatedCount += 1
    else createdCount += 1
  }

  console.log(`✓ Test orders ready — ${createdCount} created, ${updatedCount} updated.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
