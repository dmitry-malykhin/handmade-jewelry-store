'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { calculateMaxRedeemablePoints, fetchLoyaltyBalance } from '@/lib/api/loyalty'
import { useAuthStore } from '@/store/auth.store'

interface LoyaltyRedeemSectionProps {
  /** Cart subtotal in USD — caps the redemption at 50%. */
  subtotalUsd: number
  /** Points currently applied to this checkout. Owned by the parent. */
  appliedPoints: number
  onAppliedPointsChange: (points: number) => void
}

function pointsToDollars(points: number): string {
  return `$${(points / 100).toFixed(2)}`
}

/**
 * Loyalty redemption UI shown on the payment step for authenticated buyers.
 * Renders nothing for guests or users with a zero balance — keeps the page
 * uncluttered when there's no opportunity to save.
 */
export function LoyaltyRedeemSection({
  subtotalUsd,
  appliedPoints,
  onAppliedPointsChange,
}: LoyaltyRedeemSectionProps) {
  const t = useTranslations('checkoutPage.loyalty')
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const accessToken = useAuthStore((state) => state.accessToken)

  const balanceQuery = useQuery({
    queryKey: ['loyalty-balance'],
    queryFn: () => fetchLoyaltyBalance(accessToken ?? ''),
    enabled: isAuthenticated && accessToken !== null,
  })

  const balance = balanceQuery.data?.balance ?? 0
  const maxRedeemable = Math.min(balance, calculateMaxRedeemablePoints(subtotalUsd))

  // Local draft so the input updates instantly even before Apply is clicked.
  const [draft, setDraft] = useState(String(appliedPoints || ''))

  // Hide the whole section for guests (and during the brief window before
  // balance loads to avoid a flash of empty card).
  if (!isAuthenticated) return null
  if (balance <= 0) return null

  function handleApply() {
    const parsed = Math.max(0, Math.floor(Number(draft) || 0))
    const clamped = Math.min(parsed, maxRedeemable)
    onAppliedPointsChange(clamped)
    setDraft(String(clamped))
  }

  function handleApplyMax() {
    onAppliedPointsChange(maxRedeemable)
    setDraft(String(maxRedeemable))
  }

  function handleRemove() {
    onAppliedPointsChange(0)
    setDraft('')
  }

  return (
    <section
      aria-labelledby="loyalty-redeem-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h3
        id="loyalty-redeem-heading"
        className="flex items-center gap-2 text-sm font-semibold text-foreground"
      >
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        {t('heading')}
      </h3>

      <p className="mt-2 text-sm text-muted-foreground">
        {t('balance', { balance, dollars: pointsToDollars(balance) })}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t('maxRedeemable', { max: maxRedeemable, dollars: pointsToDollars(maxRedeemable) })}
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="loyalty-points-input" className="text-xs">
            {t('inputLabel')}
          </Label>
          <Input
            id="loyalty-points-input"
            type="number"
            inputMode="numeric"
            min={0}
            max={maxRedeemable}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="0"
          />
        </div>
        <Button type="button" size="sm" onClick={handleApply}>
          {t('apply')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleApplyMax}>
          {t('applyMax')}
        </Button>
      </div>

      {appliedPoints > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-md bg-accent/40 px-3 py-2 text-sm">
          <span className="text-foreground">
            {t('applied', {
              points: appliedPoints,
              dollars: pointsToDollars(appliedPoints),
            })}
          </span>
          <Button type="button" size="sm" variant="ghost" onClick={handleRemove}>
            {t('remove')}
          </Button>
        </div>
      )}
    </section>
  )
}
