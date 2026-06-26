'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Check, EyeOff, MessageSquare, Star } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { useAdminListQuery } from '@/hooks/useAdminListQuery'
import { ApiError } from '@/lib/api/client'
import {
  fetchAdminReviews,
  replyToAdminReview,
  updateAdminReviewStatus,
  type AdminReview,
  type AdminReviewsQueryParams,
  type ReviewStatus,
} from '@/lib/api/reviews'
import { useAuthStore } from '@/store/auth.store'

const STATUS_FILTER_ALL = 'ALL'
const RATING_FILTER_ALL = 'ALL'
const STATUS_VALUES: ReviewStatus[] = ['PENDING', 'APPROVED', 'HIDDEN']
const RATING_VALUES: ReadonlyArray<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5]

function StarRating({ rating, label }: { rating: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={label}>
      {Array.from({ length: 5 }, (_, starIndex) => (
        <Star
          key={starIndex}
          className={
            starIndex < rating
              ? 'size-4 fill-amber-500 text-amber-500'
              : 'size-4 text-muted-foreground/40'
          }
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const t = useTranslations('admin')
  const variantMap: Record<ReviewStatus, 'default' | 'secondary' | 'outline'> = {
    APPROVED: 'default',
    PENDING: 'secondary',
    HIDDEN: 'outline',
  }
  return <Badge variant={variantMap[status]}>{t(`reviewsStatus${status}`)}</Badge>
}

interface ReviewRowProps {
  review: AdminReview
  onStatusChange: (reviewId: string, status: ReviewStatus) => void
  onReplySave: (reviewId: string, reply: string) => void
  isSavingReply: boolean
}

function AdminReviewRow({ review, onStatusChange, onReplySave, isSavingReply }: ReviewRowProps) {
  const t = useTranslations('admin')
  const [isReplyOpen, setIsReplyOpen] = useState(false)
  const [replyDraft, setReplyDraft] = useState(review.sellerReply ?? '')

  const productImage = review.product.images[0]

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2">
            {productImage && (
              <figure className="relative size-10 shrink-0 overflow-hidden rounded border border-border bg-muted">
                <Image
                  src={productImage}
                  alt={review.product.title}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </figure>
            )}
            <span className="text-sm font-medium text-foreground">{review.product.title}</span>
          </div>
        </TableCell>
        <TableCell className="text-sm text-foreground">{review.user.email}</TableCell>
        <TableCell>
          <StarRating
            rating={review.rating}
            label={t('reviewsRatingAriaLabel', { rating: review.rating })}
          />
        </TableCell>
        <TableCell className="max-w-md whitespace-pre-wrap text-sm text-foreground">
          {review.comment ?? '—'}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {new Date(review.createdAt).toLocaleDateString()}
        </TableCell>
        <TableCell>
          <StatusBadge status={review.status} />
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {review.status !== 'APPROVED' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onStatusChange(review.id, 'APPROVED')}
              >
                <Check className="mr-1 size-3" aria-hidden="true" />
                {t('reviewsActionApprove')}
              </Button>
            )}
            {review.status !== 'HIDDEN' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onStatusChange(review.id, 'HIDDEN')}
              >
                <EyeOff className="mr-1 size-3" aria-hidden="true" />
                {t('reviewsActionHide')}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsReplyOpen((isOpen) => !isOpen)}
            >
              <MessageSquare className="mr-1 size-3" aria-hidden="true" />
              {review.sellerReply ? t('reviewsActionEditReply') : t('reviewsActionReply')}
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isReplyOpen && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30">
            <div className="space-y-2 p-2">
              <Textarea
                value={replyDraft}
                onChange={(event) => setReplyDraft(event.target.value)}
                placeholder={t('reviewsReplyPlaceholder')}
                rows={3}
                maxLength={2000}
              />
              <div className="rounded-md border border-border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('reviewsReplyByLabel')}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                  {replyDraft || t('reviewsReplyPlaceholder')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onReplySave(review.id, replyDraft.trim())
                    setIsReplyOpen(false)
                  }}
                  disabled={isSavingReply || replyDraft.trim().length === 0}
                >
                  {t('reviewsReplySave')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setReplyDraft(review.sellerReply ?? '')
                    setIsReplyOpen(false)
                  }}
                >
                  {t('reviewsReplyCancel')}
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export function AdminReviewsTable() {
  const t = useTranslations('admin')
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)

  const [statusFilter, setStatusFilter] = useState<ReviewStatus | typeof STATUS_FILTER_ALL>(
    STATUS_FILTER_ALL,
  )
  const [ratingFilter, setRatingFilter] = useState<string>(RATING_FILTER_ALL)

  const queryParams: AdminReviewsQueryParams = {
    ...(statusFilter !== STATUS_FILTER_ALL && { status: statusFilter }),
    ...(ratingFilter !== RATING_FILTER_ALL && { rating: Number(ratingFilter) }),
  }

  const { data, isPending } = useAdminListQuery({
    queryKey: ['admin-reviews'],
    queryParams,
    fetcher: fetchAdminReviews,
  })

  const statusMutation = useMutation({
    mutationFn: ({ reviewId, status }: { reviewId: string; status: ReviewStatus }) =>
      updateAdminReviewStatus(reviewId, status, accessToken ?? ''),
    onSuccess: (_data, variables) => {
      toast.success(
        t('reviewsStatusUpdateSuccess', { status: t(`reviewsStatus${variables.status}`) }),
      )
      void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t('reviewsStatusUpdateError')
      toast.error(message)
    },
  })

  const replyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      replyToAdminReview(reviewId, reply, accessToken ?? ''),
    onSuccess: () => {
      toast.success(t('reviewsReplySuccess'))
      void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t('reviewsReplyError')
      toast.error(message)
    },
  })

  return (
    <section aria-labelledby="reviews-heading" className="space-y-4">
      <div>
        <h1 id="reviews-heading" className="text-xl font-semibold text-foreground">
          {t('reviewsTitle')}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('reviewsDescription')}</p>
      </div>

      <fieldset className="flex flex-wrap items-end gap-3" aria-label={t('reviewsFilterStatus')}>
        <div className="space-y-1">
          <label htmlFor="reviews-status-filter" className="text-xs text-muted-foreground">
            {t('reviewsFilterStatus')}
          </label>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as ReviewStatus | typeof STATUS_FILTER_ALL)
            }
          >
            <SelectTrigger id="reviews-status-filter" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_FILTER_ALL}>{t('reviewsFilterStatusAll')}</SelectItem>
              {STATUS_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`reviewsStatus${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label htmlFor="reviews-rating-filter" className="text-xs text-muted-foreground">
            {t('reviewsFilterRating')}
          </label>
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger id="reviews-rating-filter" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={RATING_FILTER_ALL}>{t('reviewsFilterRatingAll')}</SelectItem>
              {RATING_VALUES.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </fieldset>

      {isPending && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('reviewsLoading')}
        </p>
      )}

      {data && data.data.length === 0 && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('reviewsEmpty')}
        </p>
      )}

      {data && data.data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('reviewsColProduct')}</TableHead>
              <TableHead>{t('reviewsColReviewer')}</TableHead>
              <TableHead>{t('reviewsColRating')}</TableHead>
              <TableHead>{t('reviewsColComment')}</TableHead>
              <TableHead>{t('reviewsColDate')}</TableHead>
              <TableHead>{t('reviewsColStatus')}</TableHead>
              <TableHead className="text-right">{t('reviewsColActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((review) => (
              <AdminReviewRow
                key={review.id}
                review={review}
                onStatusChange={(reviewId, status) => statusMutation.mutate({ reviewId, status })}
                onReplySave={(reviewId, reply) => replyMutation.mutate({ reviewId, reply })}
                isSavingReply={replyMutation.isPending}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
