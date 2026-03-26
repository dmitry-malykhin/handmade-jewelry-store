import { z } from 'zod'

export const checkoutAddressSchema = z.object({
  email: z.string().min(1).email(),
  fullName: z.string().min(2).max(100),
  addressLine1: z.string().min(3).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(2).max(20),
  country: z.string().length(2),
  phone: z.string().max(30).optional(),
})

export type CheckoutAddressFormValues = z.infer<typeof checkoutAddressSchema>
