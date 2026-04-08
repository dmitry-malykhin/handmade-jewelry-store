// Mirrors ConfirmationPage layout to prevent CLS:
//   main.mx-auto.max-w-2xl.px-4.py-12 > div.space-y-8 {
//     ConfirmationSuccessHeader (checkmark icon + heading + order ID)
//     Separator
//     ConfirmationNextSteps (3-step list)
//     Separator
//     ConfirmationOrderItems (items list)
//     Separator
//     ConfirmationOrderSummary (totals)
//     Button.size-lg (continue shopping)
//   }
export default function ConfirmationLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="space-y-8">
        {/* ConfirmationSuccessHeader: centered icon + h1 + order ID */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-16 animate-pulse rounded-full bg-skeleton-base" />
          <div className="h-8 w-48 animate-pulse rounded bg-skeleton-base" />
          <div className="h-4 w-36 animate-pulse rounded bg-skeleton-base" />
        </div>

        <div className="h-px w-full bg-border" />

        {/* ConfirmationNextSteps: 3 step items */}
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, stepIndex) => (
            <div key={stepIndex} className="flex items-start gap-3">
              <div className="size-8 shrink-0 animate-pulse rounded-full bg-skeleton-base" />
              <div className="flex flex-1 flex-col gap-1.5 pt-1">
                <div className="h-4 w-32 animate-pulse rounded bg-skeleton-base" />
                <div className="h-3 w-full animate-pulse rounded bg-skeleton-base" />
              </div>
            </div>
          ))}
        </div>

        <div className="h-px w-full bg-border" />

        {/* ConfirmationOrderItems: 2 items */}
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, itemIndex) => (
            <div key={itemIndex} className="flex items-center gap-4">
              <div className="size-16 shrink-0 animate-pulse rounded bg-skeleton-base" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="h-4 w-1/2 animate-pulse rounded bg-skeleton-base" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-skeleton-base" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-skeleton-base" />
            </div>
          ))}
        </div>

        <div className="h-px w-full bg-border" />

        {/* ConfirmationOrderSummary: totals */}
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-skeleton-base" />
              <div className="h-4 w-16 animate-pulse rounded bg-skeleton-base" />
            </div>
          ))}
        </div>

        {/* Continue shopping Button.size-lg */}
        <div className="flex justify-center pt-2">
          <div className="h-11 w-40 animate-pulse rounded bg-skeleton-base" />
        </div>
      </div>
    </main>
  )
}
