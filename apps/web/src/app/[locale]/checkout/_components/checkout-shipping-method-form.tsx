'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useCheckoutTotalPrice } from '@/store/cart.store'
import {
  SHIPPING_OPTIONS,
  calculateShippingCost,
  type ShippingOption,
  type ShippingOptionId,
} from '../_lib/shipping-options'
import {
  calculateEstimatedDelivery,
  formatDeliveryRange,
} from '../_lib/calculate-estimated-delivery'
import { CheckoutOrderSummary } from './checkout-order-summary'
import { CheckoutSteps } from './checkout-steps'

interface CheckoutShippingMethodFormProps {
  onNext: (selectedOption: ShippingOption, shippingCost: number) => void
  onBack: () => void
}

interface ShippingOptionViewModel {
  option: ShippingOption
  shippingCost: number
  isFree: boolean
  deliveryRange: string
}

export function CheckoutShippingMethodForm({ onNext, onBack }: CheckoutShippingMethodFormProps) {
  const t = useTranslations('checkoutPage')
  const cartSubtotal = useCheckoutTotalPrice()
  const [selectedOptionId, setSelectedOptionId] = useState<ShippingOptionId>('standard')

  // Precompute display data for each option — avoids redundant calls inside map
  const shippingOptionViewModels = useMemo<ShippingOptionViewModel[]>(
    () =>
      SHIPPING_OPTIONS.map((option) => {
        const shippingCost = calculateShippingCost(option, cartSubtotal)
        const delivery = calculateEstimatedDelivery(option.businessDaysMin, option.businessDaysMax)
        return {
          option,
          shippingCost,
          isFree: shippingCost === 0,
          deliveryRange: formatDeliveryRange(delivery.earliest, delivery.latest),
        }
      }),
    [cartSubtotal],
  )

  const selectedViewModel = shippingOptionViewModels.find((vm) => vm.option.id === selectedOptionId)
  // selectedOptionId is always valid — initialised to 'standard' which exists in SHIPPING_OPTIONS
  const resolvedViewModel = selectedViewModel ?? shippingOptionViewModels[0]

  function handleContinue() {
    if (resolvedViewModel) {
      onNext(resolvedViewModel.option, resolvedViewModel.shippingCost)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <CheckoutSteps currentStep={2} />

        <fieldset>
          <legend className="mb-4 text-lg font-semibold text-foreground">
            {t('shippingMethodTitle')}
          </legend>

          <ul role="list" className="space-y-3">
            {shippingOptionViewModels.map(({ option, shippingCost, isFree, deliveryRange }) => {
              const isSelected = selectedOptionId === option.id

              return (
                <li key={option.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:bg-accent',
                    )}
                  >
                    <input
                      type="radio"
                      name="shippingMethod"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => setSelectedOptionId(option.id)}
                      className="mt-1 accent-primary"
                      aria-label={t(`shippingOption_${option.id}`)}
                    />
                    <div className="flex flex-1 flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {t(`shippingOption_${option.id}`)}
                        </span>
                        <data value={shippingCost} className="font-semibold text-foreground">
                          {isFree ? (
                            <span className="text-green-600 dark:text-green-400">
                              {t('shippingFree')}
                            </span>
                          ) : (
                            `$${shippingCost.toFixed(2)}`
                          )}
                        </data>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('estimatedDelivery', { date: deliveryRange })}
                      </p>
                    </div>
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row-reverse">
          <Button size="lg" className="w-full sm:w-auto sm:min-w-48" onClick={handleContinue}>
            {t('continueToPayment')}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full sm:w-auto"
            onClick={onBack}
            aria-label={t('backToShippingAddress')}
          >
            {t('back')}
          </Button>
        </div>
      </div>

      {/* Pass selectedOption so sidebar shows correct delivery dates */}
      <CheckoutOrderSummary
        shippingCost={resolvedViewModel?.shippingCost}
        selectedOption={resolvedViewModel?.option}
      />
    </div>
  )
}
