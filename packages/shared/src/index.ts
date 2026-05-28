// Shared TypeScript types used across apps/web and apps/api

export type { MeasurementSystem, ConvertedLength } from './measurementConverter'
export { convertLength, convertDimensions } from './measurementConverter'

export type { DisplayCurrency } from './formatCurrencyPrice'
export {
  SUPPORTED_DISPLAY_CURRENCIES,
  isDisplayCurrency,
  formatCurrencyPrice,
} from './formatCurrencyPrice'

// ── Products ──────────────────────────────────────────────────────────────────

export type StockType = 'IN_STOCK' | 'MADE_TO_ORDER' | 'ONE_OF_A_KIND'

export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED'

export interface Category {
  id: string
  name: string
  slug: string
}

export interface CategoryWithCount extends Category {
  _count: { products: number }
}

export interface Product {
  id: string
  title: string
  description: string
  price: string // Prisma Decimal serialises to string in JSON
  stock: number
  images: string[]
  slug: string
  sku: string | null
  weight: number | null
  material: string | null
  avgRating: number
  reviewCount: number
  status: ProductStatus
  stockType: StockType
  productionDays: number
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  diameterCm: number | null
  weightGrams: number | null
  beadSizeMm: number | null
  categoryId: string
  category: Pick<Category, 'name' | 'slug'>
  createdAt: string
  updatedAt: string
}

export interface ProductsResponse {
  data: Product[]
  meta: {
    totalCount: number
    page: number
    limit: number
    totalPages: number
  }
}

// ── API wrappers ──────────────────────────────────────────────────────────────

export type ApiResponse<T> = {
  data: T
  message?: string
}

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  total: number
  page: number
  limit: number
}

// ── Cart ──────────────────────────────────────────────────────────────────────

/**
 * Snapshot of a product captured when it is added to the cart.
 * Intentionally flat — cart items are independent of live product data.
 */
export interface CartItem {
  productId: string
  slug: string // for URL: /products/sterling-silver-ring
  title: string
  price: number // USD, e.g. 49.99
  image: string // URL of the primary product image
  quantity: number
  // Production lead time (business days) captured at add-to-cart time.
  // Drives per-item ETA in cart and order ETA at checkout. 0 = ships immediately.
  // Optional for backwards compatibility with carts persisted before #227.
  productionDays?: number
}

// ── User ──────────────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'admin'

/**
 * Authenticated user profile.
 * Populated after login; stored only in memory (not persisted to localStorage).
 * Auth is driven by HTTP-only cookie — this type holds the decoded user data.
 */
export interface UserProfile {
  id: string
  email: string
  name: string | null
  role: UserRole
  avatarUrl: string | null
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  productCount: number
  orderCount: number
  totalRevenueCents: number
}

export type RevenueChartPeriod = '7d' | '30d' | '90d' | '1y'

export interface RevenueChartDataPoint {
  date: string // ISO date string YYYY-MM-DD
  revenueCents: number
}

export interface RevenueStats {
  totalRevenueCents: number
  orderCount: number
  avgOrderValueCents: number
  chartData: RevenueChartDataPoint[]
}

/** Top-products analytics row (#166). One per product, ranked by revenue desc. */
export interface TopProductRow {
  productId: string
  slug: string
  title: string
  image: string | null
  unitsSold: number
  revenueCents: number
  avgRating: number
  reviewCount: number
}

export type OrderStatusForBreakdown =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'

/** Status → count for the donut chart on /admin/analytics. */
export interface OrderStatusBreakdownRow {
  status: OrderStatusForBreakdown
  count: number
}

/** Topline business metrics on /admin/analytics — period-scoped. */
export interface KeyMetrics {
  /** Customers with their first paid order inside the period. */
  newCustomers: number
  /** Customers with ≥2 paid orders ever, at least one inside the period. */
  returningCustomers: number
  /** Percentage 0-100. (refundedOrders / paidOrders) × 100 inside the period. */
  refundRatePercent: number
  /** Mean of (deliveredAt − createdAt) days for orders DELIVERED inside the period. */
  avgDaysOrderToDelivery: number
}
