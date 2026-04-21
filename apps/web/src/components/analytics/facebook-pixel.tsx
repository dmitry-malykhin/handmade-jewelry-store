'use client'

import Script from 'next/script'
import { useMarketingConsent } from '@/store/cookie-consent.store'

interface FacebookPixelProps {
  pixelId: string
}

/**
 * Loads Facebook Pixel script and fires PageView.
 * Only activates when the user has accepted marketing cookies.
 * FB Pixel auto-tracks SPA navigations via its internal history listener.
 */
export function FacebookPixel({ pixelId }: FacebookPixelProps) {
  const hasMarketingConsent = useMarketingConsent()

  if (!hasMarketingConsent) return null

  return (
    <Script id="fb-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `}
    </Script>
  )
}
