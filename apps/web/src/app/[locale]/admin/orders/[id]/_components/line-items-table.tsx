'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AdminOrderDetail as AdminOrderDetailType } from '@/lib/api/orders'

export function LineItemsTable({ order }: { order: AdminOrderDetailType }) {
  const t = useTranslations('admin')
  return (
    <section aria-labelledby="line-items-heading">
      <h2
        id="line-items-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('orderDetailSectionItems')}
      </h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('orderDetailItemColProduct')}</TableHead>
              <TableHead>{t('orderDetailItemColSku')}</TableHead>
              <TableHead className="text-right">{t('orderDetailItemColQty')}</TableHead>
              <TableHead className="text-right">{t('orderDetailItemColUnitPrice')}</TableHead>
              <TableHead className="text-right">{t('orderDetailItemColLineTotal')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((orderItem) => {
              const snapshot = orderItem.productSnapshot
              const lineTotal = Number(orderItem.price) * orderItem.quantity
              return (
                <TableRow key={orderItem.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {snapshot.image && (
                        <figure className="relative size-10 shrink-0 overflow-hidden rounded border border-border bg-muted">
                          <Image
                            src={snapshot.image}
                            alt={snapshot.title}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </figure>
                      )}
                      <span className="text-sm font-medium text-foreground">{snapshot.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {snapshot.sku ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">{orderItem.quantity}</TableCell>
                  <TableCell className="text-right">
                    <data value={orderItem.price}>${Number(orderItem.price).toFixed(2)}</data>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <data value={lineTotal}>${lineTotal.toFixed(2)}</data>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
