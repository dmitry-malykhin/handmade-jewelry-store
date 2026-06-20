import { z } from 'zod'

export const STOCK_TYPES = ['IN_STOCK', 'MADE_TO_ORDER', 'ONE_OF_A_KIND'] as const

export const createProductSchema = z
  .object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(200),
    description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
    price: z
      .number({ message: 'Price must be a number' })
      .positive('Price must be positive')
      .multipleOf(0.01, 'Price can have at most 2 decimal places'),
    // Binary: 0 (made on order) or 1 (one piece ready to ship).
    stock: z
      .number({ message: 'Stock must be a number' })
      .int('Stock must be a whole number')
      .min(0, 'Stock cannot be negative')
      .max(1, 'Each handmade piece is unique — stock can only be 0 or 1'),
    images: z
      .array(z.string().url('Each image must be a valid URL'))
      .min(1, 'At least one image is required')
      .max(10, 'Maximum 10 images allowed'),
    slug: z
      .string()
      .min(2)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens'),
    categoryId: z.string().min(1, 'Category is required'),
    sku: z.string().max(100).optional().or(z.literal('')),
    material: z.string().max(200).optional().or(z.literal('')),
    stockType: z.enum(STOCK_TYPES).default('IN_STOCK'),
    // Required when stock = 0 — see .superRefine below.
    productionDays: z.number().int().min(0).max(365).optional(),
    lengthCm: z.number().positive().max(500).optional(),
    widthCm: z.number().positive().max(500).optional(),
    heightCm: z.number().positive().max(500).optional(),
    diameterCm: z.number().positive().max(500).optional(),
    weightGrams: z.number().positive().max(10000).optional(),
    beadSizeMm: z.number().positive().max(100).optional(),
  })
  .superRefine((value, ctx) => {
    // 0 days + 0 stock is contradictory — when nothing is ready, the master
    // must commit to a lead time so the customer knows the wait.
    if (value.stock === 0 && (value.productionDays === undefined || value.productionDays < 1)) {
      ctx.addIssue({
        code: 'custom',
        path: ['productionDays'],
        message: 'Production days must be at least 1 when stock is set to "Made on order"',
      })
    }
  })

export type CreateProductFormValues = z.input<typeof createProductSchema>
