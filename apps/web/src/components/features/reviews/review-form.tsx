'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/auth.store'
import { createReview } from '@/lib/api/reviews'
import { ApiError } from '@/lib/api/client'
import { StarRating } from './star-rating'

interface ReviewFormProps {
  productId: string
  onSuccess: () => void
}

/**
 * Submit a star rating + optional comment. Requires the user to have purchased
 * the product (verified server-side). Form hides itself on success.
 */
export function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const t = useTranslations('productReviews.form')
  const accessToken = useAuthStore((state) => state.accessToken)
  const clearTokens = useAuthStore((state) => state.clearTokens)

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError(null)

    if (!accessToken) {
      setValidationError(t('errorUnauthorized'))
      return
    }

    if (rating < 1 || rating > 5) {
      setValidationError(t('errorRatingRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      await createReview(accessToken, {
        productId,
        rating,
        ...(comment.trim() && { comment: comment.trim() }),
      })
      toast.success(t('submittedSuccess'))
      onSuccess()
    } catch (error) {
      // 401 means token expired — clear auth state so the form is hidden and
      // the parent component shows the "Sign in to review" link instead.
      if (error instanceof ApiError && error.status === 401) {
        clearTokens()
        setValidationError(t('errorSessionExpired'))
      } else {
        const message = error instanceof ApiError ? error.message : t('errorGeneric')
        setValidationError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={t('title')}
      className="rounded-lg border border-border bg-card p-5"
    >
      <fieldset disabled={isSubmitting} className="space-y-4">
        <legend className="text-base font-medium">{t('title')}</legend>

        <div className="space-y-2">
          <Label htmlFor="review-rating">{t('ratingLabel')}</Label>
          <StarRating value={rating} onChange={setRating} size="lg" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-comment">{t('commentLabel')}</Label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={2000}
            rows={4}
            placeholder={t('commentPlaceholder')}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">{t('commentHelper')}</p>
        </div>

        {validationError && (
          <p role="alert" className="text-sm text-destructive">
            {validationError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting || rating === 0}>
          {isSubmitting ? t('submitting') : t('submit')}
        </Button>
      </fieldset>
    </form>
  )
}
