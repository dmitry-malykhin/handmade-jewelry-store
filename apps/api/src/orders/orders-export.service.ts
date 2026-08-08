import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { buildCsvDocument } from '../common/csv/csv-formatter'
import { PrismaService } from '../prisma/prisma.service'
import { OrderExportQueryDto } from './dto/order-export-query.dto'

const ORDER_EXPORT_HEADERS = [
  'order_id',
  'date',
  'customer_email',
  'customer_name',
  'shipping_address',
  'items',
  'subtotal',
  'shipping',
  'total',
  'status',
  'tracking_number',
] as const

interface ShippingAddressSnapshot {
  fullName?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

function formatShippingAddress(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== 'object') return ''
  const address = snapshot as ShippingAddressSnapshot
  const streetLines = [address.addressLine1, address.addressLine2].filter(Boolean).join(' ')
  const cityLine = [address.city, address.state, address.postalCode].filter(Boolean).join(' ')
  return [streetLines, cityLine, address.country].filter(Boolean).join(', ')
}

interface OrderItemForExport {
  productSnapshot: unknown
  quantity: number
}

// Renders as `"Title × 2 | Title × 1"` — a single readable CSV cell.
function formatOrderItems(items: readonly OrderItemForExport[]): string {
  return items
    .map((item) => {
      const snapshot = item.productSnapshot
      const title =
        snapshot && typeof snapshot === 'object' && 'title' in snapshot
          ? String((snapshot as { title: unknown }).title)
          : '(deleted product)'
      return `${title} × ${item.quantity}`
    })
    .join(' | ')
}

@Injectable()
export class OrdersExportService {
  constructor(private readonly prismaService: PrismaService) {}

  // Returns the whole filtered set as a single CSV string — admins clicking
  // Export expect the full result. Newest first so the relevant rows lead.
  async exportToCsv(query: OrderExportQueryDto): Promise<string> {
    const { status, from, to } = query

    const whereClause: Prisma.OrderWhereInput = {
      ...(status && { status }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    }

    const orders = await this.prismaService.order.findMany({
      where: whereClause,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })

    const rows = orders.map((order) => {
      const shippingAddress = formatShippingAddress(order.shippingAddress)
      const customerName = (order.shippingAddress as ShippingAddressSnapshot | null)?.fullName ?? ''
      return [
        order.id,
        order.createdAt.toISOString(),
        order.guestEmail ?? order.userId ?? '',
        customerName,
        shippingAddress,
        formatOrderItems(order.items),
        order.subtotal.toFixed(2),
        order.shippingCost.toFixed(2),
        order.total.toFixed(2),
        order.status,
        order.trackingNumber ?? '',
      ]
    })

    return buildCsvDocument(ORDER_EXPORT_HEADERS, rows)
  }
}
