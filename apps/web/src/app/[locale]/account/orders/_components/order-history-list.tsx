'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import { fetchMyOrders, type OrderDetails, type OrderStatus } from '@/lib/api/orders'

const STATUS_BADGE_VARIANT: Record<OrderStatus, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  PAID: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  PROCESSING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  SHIPPED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
}

function formatDate(isoString: string, locale: string): string {
  return new Date(isoString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function OrderHistoryList() {
  const t = useTranslations('account.orders')
  const accessToken = useAuthStore((state) => state.accessToken)

  const [orders, setOrders] = useState<OrderDetails[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    fetchMyOrders(accessToken)
      .then(setOrders)
      .catch(() => setLoadError(t('loadError')))
  }, [accessToken, t])

  if (loadError) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">{loadError}</p>
      </div>
    )
  }

  if (orders === null) {
    return (
      <ul role="list" className="space-y-3" aria-busy="true" aria-label={t('loading')}>
        {[0, 1, 2].map((index) => (
          <li key={index} className="h-28 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </ul>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-base font-medium text-foreground">{t('emptyTitle')}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('emptyDescription')}</p>
        <Button asChild className="mt-6">
          <Link href="/shop">{t('emptyAction')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <ul role="list" className="space-y-4">
      {orders.map((order) => {
        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
        const previewItems = order.items.slice(0, 3)

        return (
          <li key={order.id}>
            <article className="rounded-lg border border-border bg-card p-5">
              <header className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t('orderNumber')}
                  </p>
                  <p className="font-mono text-sm font-medium text-foreground">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(order.createdAt, 'en-US')}
                </div>
                <span
                  className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE_VARIANT[order.status]}`}
                >
                  {t(`status.${order.status}`)}
                </span>
              </header>

              <div className="mt-4 flex items-center justify-between gap-4">
                <ul role="list" className="flex -space-x-2">
                  {previewItems.map((item) => (
                    <li
                      key={item.id}
                      className="relative size-12 overflow-hidden rounded-md border-2 border-card bg-muted"
                    >
                      {item.productSnapshot.image && (
                        <Image
                          src={item.productSnapshot.image}
                          alt={item.productSnapshot.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      )}
                    </li>
                  ))}
                  {order.items.length > previewItems.length && (
                    <li className="flex size-12 items-center justify-center rounded-md border-2 border-card bg-muted text-xs text-muted-foreground">
                      +{order.items.length - previewItems.length}
                    </li>
                  )}
                </ul>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {t('itemCount', { count: itemCount })}
                  </p>
                  <p className="text-base font-semibold">{formatPrice(order.total)}</p>
                </div>
              </div>
            </article>
          </li>
        )
      })}
    </ul>
  )
}
