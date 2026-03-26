import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface CheckoutStepsProps {
  currentStep: 1 | 2 | 3
}

export function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  const t = useTranslations('checkoutPage')

  const steps = [
    { number: 1, label: t('stepShipping') },
    { number: 2, label: t('stepShippingMethod') },
    { number: 3, label: t('stepPayment') },
  ]

  return (
    <nav aria-label={t('stepsLabel')} className="mb-8">
      <ol className="flex items-center gap-0">
        {steps.map((step, index) => (
          <li key={step.number} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                  step.number < currentStep && 'bg-primary text-primary-foreground',
                  step.number === currentStep &&
                    'border-2 border-primary bg-background text-primary',
                  step.number > currentStep &&
                    'border-2 border-border bg-background text-muted-foreground',
                )}
                aria-current={step.number === currentStep ? 'step' : undefined}
              >
                {step.number}
              </span>
              <span
                className={cn(
                  'hidden text-sm sm:block',
                  step.number === currentStep
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'mx-3 h-px w-8 sm:w-16',
                  step.number < currentStep ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
