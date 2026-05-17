'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import {
  fetchAdminProductionQueue,
  updateAdminOrderProduction,
  type ProductionQueueItem,
  type ProductionStatus,
} from '@/lib/api/orders'

const PRODUCTION_STATUSES: ProductionStatus[] = ['QUEUED', 'IN_PRODUCTION', 'READY_TO_SHIP']

/**
 * Days between two dates, rounded toward zero so a deadline 1.5 days away
 * shows as "1 day left" (under-promise) rather than "2 days left".
 */
function daysUntil(deadlineIso: string): number {
  const now = Date.now()
  const deadline = new Date(deadlineIso).getTime()
  return Math.floor((deadline - now) / (1000 * 60 * 60 * 24))
}

export function ProductionTable() {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ['admin-production'],
    queryFn: () => fetchAdminProductionQueue(accessToken ?? ''),
    enabled: accessToken !== null,
  })

  const updateProductionMutation = useMutation({
    mutationFn: ({
      orderId,
      productionStatus,
      productionNotes,
    }: {
      orderId: string
      productionStatus: ProductionStatus
      productionNotes?: string
    }) =>
      updateAdminOrderProduction(orderId, { productionStatus, productionNotes }, accessToken ?? ''),
    onSuccess: (updated) => {
      toast.success(
        t('productionStatusUpdateSuccess', {
          orderId: updated.id.slice(-8).toUpperCase(),
        }),
      )
      void queryClient.invalidateQueries({ queryKey: ['admin-production'] })
    },
    onError: () => {
      toast.error(t('productionStatusUpdateError'))
    },
  })

  return (
    <section aria-labelledby="production-heading" className="space-y-4">
      <div>
        <h1 id="production-heading" className="text-xl font-semibold text-foreground">
          {t('productionTitle')}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('productionDescription')}</p>
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('orderDetailLoading')}
        </p>
      )}

      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('productionEmpty')}
        </p>
      )}

      {data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('productionColOrderId')}</TableHead>
              <TableHead>{t('productionColCustomer')}</TableHead>
              <TableHead>{t('productionColItems')}</TableHead>
              <TableHead>{t('productionColDeadline')}</TableHead>
              <TableHead>{t('productionColStatus')}</TableHead>
              <TableHead>{t('productionColNotes')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((order) => (
              <ProductionRow
                key={order.id}
                order={order}
                onUpdateStatus={(productionStatus) =>
                  updateProductionMutation.mutate({
                    orderId: order.id,
                    productionStatus,
                    productionNotes: order.productionNotes ?? undefined,
                  })
                }
                onSaveNotes={(productionNotes) =>
                  updateProductionMutation.mutate({
                    orderId: order.id,
                    productionStatus: order.productionStatus,
                    productionNotes,
                  })
                }
                isSaving={updateProductionMutation.isPending}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

interface ProductionRowProps {
  order: ProductionQueueItem
  onUpdateStatus: (next: ProductionStatus) => void
  onSaveNotes: (notes: string) => void
  isSaving: boolean
}

function ProductionRow({ order, onUpdateStatus, onSaveNotes, isSaving }: ProductionRowProps) {
  const t = useTranslations('admin')
  const days = useMemo(() => daysUntil(order.productionDeadlineAt), [order.productionDeadlineAt])
  const [notesDraft, setNotesDraft] = useState(order.productionNotes ?? '')

  function commitNotes() {
    const trimmed = notesDraft.trim()
    if (trimmed === (order.productionNotes ?? '')) return
    onSaveNotes(trimmed)
  }

  const mtoItemCount = order.items.filter(
    // OrderItem.productSnapshot.title is the human-friendly label captured at order time
    (item) => item.productSnapshot?.title,
  ).length

  return (
    <TableRow>
      <TableCell>
        <Link href={`/admin/orders/${order.id}`} className="font-mono text-sm hover:underline">
          {order.id.slice(-8).toUpperCase()}
        </Link>
      </TableCell>
      <TableCell className="text-sm text-foreground">{order.guestEmail ?? '—'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{mtoItemCount}</TableCell>
      <TableCell>
        <DeadlineCell days={days} t={t} />
      </TableCell>
      <TableCell>
        <Select
          value={order.productionStatus}
          onValueChange={(value) => onUpdateStatus(value as ProductionStatus)}
          disabled={isSaving}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCTION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`productionStatus${status}` as Parameters<typeof t>[0])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={notesDraft}
          onChange={(event) => setNotesDraft(event.target.value)}
          onBlur={commitNotes}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitNotes()
          }}
          placeholder={t('productionNotesPlaceholder')}
          disabled={isSaving}
          maxLength={500}
          className="w-56"
          aria-label={t('productionNotesSaveAriaLabel', {
            orderId: order.id.slice(-8).toUpperCase(),
          })}
        />
      </TableCell>
    </TableRow>
  )
}

interface DeadlineCellProps {
  days: number
  t: ReturnType<typeof useTranslations<'admin'>>
}

function DeadlineCell({ days, t }: DeadlineCellProps) {
  if (days < 0) {
    return (
      <Badge variant="destructive">
        {t('productionDeadlineOverdue', { days: Math.abs(days) })}
      </Badge>
    )
  }
  if (days === 0) {
    return <Badge variant="destructive">{t('productionDeadlineToday')}</Badge>
  }
  const tone =
    days <= 3
      ? 'border-amber-400 text-amber-700 dark:border-amber-500 dark:text-amber-300'
      : 'border-green-500 text-green-700 dark:border-green-500 dark:text-green-300'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs tabular-nums',
        tone,
      )}
    >
      {t('productionDeadlineDays', { days })}
    </span>
  )
}
