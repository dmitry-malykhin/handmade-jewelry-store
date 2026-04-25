/**
 * Klaviyo _learnq wrapper — type-safe event helpers.
 * All functions are no-ops when KLAVIYO_PUBLIC_API_KEY is not set or _learnq is unavailable.
 *
 * Events use Klaviyo's standard e-commerce naming so they map to default flows:
 *   'Viewed Product' → Browse abandonment
 *   'Added to Cart'  → Abandoned cart flow
 *   'Started Checkout' → Abandoned checkout flow
 *   'Placed Order'   → Order confirmation + post-purchase flows
 */

function getQueue(): Array<[string, ...unknown[]]> | null {
  if (typeof window === 'undefined') return null
  window._learnq = window._learnq ?? []
  return window._learnq
}

// ── Identify ────────────────────────────────────────────────────────────────

export function klaviyoIdentify(email: string, properties?: Record<string, unknown>): void {
  const queue = getQueue()
  if (!queue) return
  queue.push(['identify', { $email: email, ...properties }])
}

// ── E-commerce events ───────────────────────────────────────────────────────

interface ProductItem {
  productId: string
  title: string
  price: number
  image?: string
  slug: string
}

export function klaviyoViewedProduct(product: ProductItem): void {
  const queue = getQueue()
  if (!queue) return
  queue.push([
    'track',
    'Viewed Product',
    {
      ProductID: product.productId,
      ProductName: product.title,
      Price: product.price,
      ImageURL: product.image,
      URL: `/shop/${product.slug}`,
    },
  ])
}

interface CartItem {
  productId: string
  title: string
  price: number
  quantity: number
}

export function klaviyoAddedToCart(item: CartItem, cartTotal: number): void {
  const queue = getQueue()
  if (!queue) return
  queue.push([
    'track',
    'Added to Cart',
    {
      AddedItem: {
        ProductID: item.productId,
        ProductName: item.title,
        Price: item.price,
        Quantity: item.quantity,
      },
      CartTotal: cartTotal,
    },
  ])
}

export function klaviyoStartedCheckout(cartItems: CartItem[], cartTotal: number): void {
  const queue = getQueue()
  if (!queue) return
  queue.push([
    'track',
    'Started Checkout',
    {
      $value: cartTotal,
      ItemCount: cartItems.reduce((acc, item) => acc + item.quantity, 0),
      Items: cartItems.map((item) => ({
        ProductID: item.productId,
        ProductName: item.title,
        Price: item.price,
        Quantity: item.quantity,
      })),
    },
  ])
}

interface PlacedOrderData {
  orderId: string
  total: number
  items: CartItem[]
}

export function klaviyoPlacedOrder(order: PlacedOrderData): void {
  const queue = getQueue()
  if (!queue) return
  queue.push([
    'track',
    'Placed Order',
    {
      $event_id: order.orderId,
      $value: order.total,
      OrderId: order.orderId,
      Items: order.items.map((item) => ({
        ProductID: item.productId,
        ProductName: item.title,
        Price: item.price,
        Quantity: item.quantity,
      })),
    },
  ])
}
