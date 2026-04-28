'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useAuthStore } from '@/store/auth.store'
import {
  fetchProductReviews,
  fetchReviewEligibility,
  type ProductReview,
  type ReviewEligibility,
} from '@/lib/api/reviews'
import { StarRating } from './star-rating'
import { ReviewForm } from './review-form'

interface ReviewsSectionProps {
  productId: string
  productSlug: string
  initialAvgRating: number
  initialReviewCount: number
}

function formatDate(isoString: string, locale: string): string {
  return new Date(isoString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function ReviewsSection({
  productId,
  productSlug,
  initialAvgRating,
  initialReviewCount,
}: ReviewsSectionProps) {
  const t = useTranslations('productReviews')
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const accessToken = useAuthStore((state) => state.accessToken)

  const [reviews, setReviews] = useState<ProductReview[] | null>(null)
  const [avgRating, setAvgRating] = useState(initialAvgRating)
  const [totalCount, setTotalCount] = useState(initialReviewCount)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null)
  // isHydrated prevents server/client mismatch — auth state is only valid after Zustand rehydrates
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Wrapped in useCallback so the effect can declare it as a dep without re-running each render
  const loadReviews = useCallback(() => {
    fetchProductReviews(productSlug)
      .then((response) => {
        setReviews(response.data)
        setAvgRating(response.meta.avgRating)
        setTotalCount(response.meta.totalCount)
      })
      .catch(() => setLoadError(t('loadError')))
  }, [productSlug, t])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  useEffect(() => {
    if (!isHydrated || !accessToken) {
      setEligibility(null)
      return
    }
    fetchReviewEligibility(accessToken, productId)
      .then(setEligibility)
      .catch(() => setEligibility(null))
  }, [isHydrated, accessToken, productId])

  function handleWriteReviewClick() {
    setShowForm(true)
  }

  function handleSubmitSuccess() {
    setShowForm(false)
    setEligibility((current) =>
      current ? { ...current, hasReviewed: true, canReview: false } : current,
    )
    loadReviews()
  }

  return (
    <section aria-labelledby="reviews-heading" className="mt-12 border-t border-border pt-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="reviews-heading" className="text-2xl font-light">
            {t('heading')}
          </h2>
          <div className="mt-2 flex items-center gap-3">
            <StarRating value={Math.round(avgRating)} size="md" />
            <span className="text-sm text-muted-foreground">
              {avgRating.toFixed(1)} · {t('totalCount', { count: totalCount })}
            </span>
          </div>
        </div>

        {!showForm &&
          isHydrated &&
          (isAuthenticated ? (
            eligibility?.canReview ? (
              <button
                type="button"
                onClick={handleWriteReviewClick}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t('writeReview')}
              </button>
            ) : null
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              {t('signInToReview')}
            </Link>
          ))}
      </header>

      {!showForm && isHydrated && isAuthenticated && eligibility && !eligibility.canReview && (
        <p className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          {eligibility.hasReviewed ? t('alreadyReviewed') : t('purchaseRequired')}
        </p>
      )}

      {showForm && (
        <div className="mt-6">
          <ReviewForm productId={productId} onSuccess={handleSubmitSuccess} />
        </div>
      )}

      {loadError ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {loadError}
        </p>
      ) : reviews === null ? (
        <ul role="list" className="mt-6 space-y-3" aria-busy="true">
          {[0, 1].map((index) => (
            <li
              key={index}
              className="h-24 animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </ul>
      ) : reviews.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t('emptyState')}</p>
      ) : (
        <ul role="list" className="mt-6 space-y-4">
          {reviews.map((review) => (
            <li key={review.id}>
              <article className="rounded-lg border border-border bg-card p-5">
                <header className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{review.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(review.createdAt, 'en-US')}
                    </p>
                  </div>
                  <StarRating value={review.rating} size="sm" />
                </header>
                {review.comment && <p className="mt-3 text-sm text-foreground">{review.comment}</p>}
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
