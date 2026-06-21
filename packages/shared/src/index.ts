export type { MeasurementSystem, ConvertedLength } from './measurementConverter'
export { convertLength, convertDimensions } from './measurementConverter'

export type { DisplayCurrency } from './formatCurrencyPrice'
export {
  SUPPORTED_DISPLAY_CURRENCIES,
  isDisplayCurrency,
  formatCurrencyPrice,
} from './formatCurrencyPrice'

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
  price: string // Prisma Decimal → string in JSON
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

export type ApiResponse<T> = {
  data: T
  message?: string
}

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  total: number
  page: number
  limit: number
}

export interface CartItem {
  productId: string
  slug: string
  title: string
  price: number
  image: string
  quantity: number
  // Optional — older persisted carts (pre-field) must stay valid.
  productionDays?: number
}

export type UserRole = 'customer' | 'admin'

export interface UserProfile {
  id: string
  email: string
  name: string | null
  role: UserRole
  avatarUrl: string | null
}

export interface AdminStats {
  productCount: number
  orderCount: number
  totalRevenueCents: number
}

export type RevenueChartPeriod = '7d' | '30d' | '90d' | '1y'

export interface RevenueChartDataPoint {
  date: string
  revenueCents: number
}

export interface RevenueStats {
  totalRevenueCents: number
  orderCount: number
  avgOrderValueCents: number
  chartData: RevenueChartDataPoint[]
}

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

export interface OrderStatusBreakdownRow {
  status: OrderStatusForBreakdown
  count: number
}

export interface KeyMetrics {
  newCustomers: number
  returningCustomers: number
  refundRatePercent: number
  avgDaysOrderToDelivery: number
}
