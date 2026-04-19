import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { OrderItem } from '@/lib/api/orders'

interface ConfirmationOrderItemsProps {
  items: OrderItem[]
}

export function ConfirmationOrderItems({ items }: ConfirmationOrderItemsProps) {
  const t = useTranslations('confirmationPage')

  return (
    <ul role="list" className="divide-y divide-border">
      {items.map((orderItem) => (
        <li key={orderItem.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
            {orderItem.productSnapshot.image ? (
              <Image
                src={orderItem.productSnapshot.image}
                alt={orderItem.productSnapshot.title}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <img src="/monogram.svg" alt="Senichka" className="size-8 opacity-50" />
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col justify-center gap-0.5">
            <p className="text-sm font-medium text-foreground leading-snug">
              {orderItem.productSnapshot.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('itemQuantity', { quantity: orderItem.quantity })}
            </p>
          </div>

          <p className="text-sm font-medium text-foreground tabular-nums">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
              orderItem.price * orderItem.quantity,
            )}
          </p>
        </li>
      ))}
    </ul>
  )
}
