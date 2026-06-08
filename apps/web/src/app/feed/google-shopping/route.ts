import { fetchAllProducts } from '@/lib/api/products'
import { logger } from '@/lib/logger'
import { getSiteUrl } from '@/lib/config/site-url'
import type { Product } from '@jewelry/shared'

const SITE_URL = getSiteUrl()
const BRAND = 'Senichka'

// ISR — regenerate feed every 6 hours
export const revalidate = 21600

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function mapAvailability(stock: number, stockType: string): string {
  if (stock > 0) return 'in_stock'
  if (stockType === 'MADE_TO_ORDER') return 'preorder'
  return 'out_of_stock'
}

function buildProductEntry(product: Product): string {
  const price = parseFloat(product.price).toFixed(2)
  const productUrl = `${SITE_URL}/en/products/${product.slug}`
  const imageUrl = product.images[0] ?? ''
  const availability = mapAvailability(product.stock, product.stockType)

  return `
    <item>
      <g:id>${escapeXml(product.id)}</g:id>
      <g:title>${escapeXml(product.title)}</g:title>
      <g:description>${escapeXml(product.description.slice(0, 5000))}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:price>${price} USD</g:price>
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${BRAND}</g:brand>
      ${product.sku ? `<g:mpn>${escapeXml(product.sku)}</g:mpn>` : ''}
      ${product.material ? `<g:material>${escapeXml(product.material)}</g:material>` : ''}
      ${product.weightGrams ? `<g:shipping_weight>${product.weightGrams} g</g:shipping_weight>` : ''}
      <g:product_type>${escapeXml(product.category.name)}</g:product_type>
      <g:google_product_category>188</g:google_product_category>
    </item>`
}

export async function GET(): Promise<Response> {
  let products: Product[] = []

  try {
    // fetchAllProducts paginates the public listing endpoint (capped at 100
    // per page by the API) so the feed contains every ACTIVE SKU, not just the
    // first page. Google Merchant Center expects the complete catalogue.
    const allProducts = await fetchAllProducts()
    products = allProducts.filter((product) => product.status === 'ACTIVE')
  } catch (error) {
    // Google Merchant Center pulls this feed daily — silently returning empty
    // would freeze our Shopping campaign. Log loudly so the failure is visible.
    logger.error('feed.google-shopping.products-fetch.failed', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${BRAND} — Handmade Beaded Jewelry</title>
    <link>${SITE_URL}</link>
    <description>Handmade beaded jewelry — bracelets, necklaces, earrings crafted with Czech beads</description>
${products.map(buildProductEntry).join('\n')}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=21600, stale-while-revalidate=3600',
    },
  })
}
