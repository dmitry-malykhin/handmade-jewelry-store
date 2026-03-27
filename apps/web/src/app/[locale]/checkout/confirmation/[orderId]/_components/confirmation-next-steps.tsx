import { CheckCircle2, Hammer, Package, Truck } from 'lucide-react'
import { useTranslations } from 'next-intl'

const NEXT_STEPS = [
  { icon: CheckCircle2, titleKey: 'step1Title', descriptionKey: 'step1Description', done: true },
  { icon: Hammer, titleKey: 'step2Title', descriptionKey: 'step2Description', done: false },
  { icon: Package, titleKey: 'step3Title', descriptionKey: 'step3Description', done: false },
  { icon: Truck, titleKey: 'step4Title', descriptionKey: 'step4Description', done: false },
] as const

export function ConfirmationNextSteps() {
  const t = useTranslations('confirmationPage')

  return (
    <section aria-labelledby="next-steps-heading">
      <h2 id="next-steps-heading" className="mb-4 text-base font-semibold text-foreground">
        {t('nextStepsTitle')}
      </h2>

      <ol className="relative border-l border-border">
        {NEXT_STEPS.map((step, index) => {
          const StepIcon = step.icon
          return (
            <li key={step.titleKey} className="mb-6 ml-6 last:mb-0">
              <span
                className={[
                  'absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background',
                  step.done ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground',
                ].join(' ')}
                aria-hidden="true"
              >
                <StepIcon className="h-3.5 w-3.5" />
              </span>

              <div
                className={index === 1 ? 'opacity-100' : step.done ? 'opacity-100' : 'opacity-50'}
              >
                <p className="text-sm font-medium text-foreground">{t(step.titleKey)}</p>
                <p className="text-sm text-muted-foreground">{t(step.descriptionKey)}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
