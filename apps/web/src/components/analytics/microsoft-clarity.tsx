'use client'

import Script from 'next/script'
import { useAnalyticsConsent } from '@/store/cookie-consent.store'

interface MicrosoftClarityProps {
  projectId: string
}

/**
 * Loads Microsoft Clarity for session recording + heatmaps. Strictly gated
 * on analytics consent — the script is not even injected until the user
 * accepts cookies (#107). On consent revocation the component returns null
 * on next render, removing the Script element; cleanup of clarity's runtime
 * is best-effort and a hard reload guarantees full detachment.
 *
 * Privacy strategy:
 *  - Stripe Payment Element runs in a Stripe-hosted iframe — Clarity cannot
 *    see card / BNPL fields by design. No per-element masking needed.
 *  - Email inputs and other PII are masked by Clarity's "Balanced" dashboard
 *    setting (Project Settings → Masking). Configured once in the Clarity UI,
 *    not in code. See docs/16_USER_ANALYTICS.md §4.
 *
 * Free tier is unlimited — no event budget, no paid plan.
 */
export function MicrosoftClarity({ projectId }: MicrosoftClarityProps) {
  const hasAnalyticsConsent = useAnalyticsConsent()

  if (!hasAnalyticsConsent) return null

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${projectId}");
      `}
    </Script>
  )
}
