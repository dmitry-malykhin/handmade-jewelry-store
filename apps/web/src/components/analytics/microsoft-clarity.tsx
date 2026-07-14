'use client'

import Script from 'next/script'
import { useAnalyticsConsent } from '@/store/cookie-consent.store'

interface MicrosoftClarityProps {
  projectId: string
}

// Strictly gated on analytics consent — script is never injected without it.
// PII masking is configured in the Clarity dashboard (Balanced), not in code;
// see docs/16_USER_ANALYTICS.md §4.
// lazyOnload: session recording is fine to start after `window.load`.
export function MicrosoftClarity({ projectId }: MicrosoftClarityProps) {
  const hasAnalyticsConsent = useAnalyticsConsent()

  if (!hasAnalyticsConsent) return null

  return (
    <Script id="microsoft-clarity" strategy="lazyOnload">
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
