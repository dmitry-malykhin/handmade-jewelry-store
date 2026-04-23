import { fetchProducts } from '@/lib/api/products'
import type { Product } from '@jewelry/shared'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
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
  const productUrl = `${SITE_URL}/en/shop/${product.slug}`
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
    const response = await fetchProducts({ limit: 1000 })
    products = response.data.filter((product) => product.status === 'ACTIVE')
  } catch {
    // API unavailable — return empty feed; will regenerate on next revalidation
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
