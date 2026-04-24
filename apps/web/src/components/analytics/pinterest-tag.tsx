'use client'

import Script from 'next/script'
import { useMarketingConsent } from '@/store/cookie-consent.store'

interface PinterestTagProps {
  tagId: string
}

/**
 * Loads Pinterest Tag script and fires page_visit.
 * Only activates when the user has accepted marketing cookies.
 */
export function PinterestTag({ tagId }: PinterestTagProps) {
  const hasMarketingConsent = useMarketingConsent()

  if (!hasMarketingConsent) return null

  return (
    <Script id="pinterest-tag" strategy="afterInteractive">
      {`
        !function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(
        Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";
        var t=document.createElement("script");t.async=!0,t.src=e;
        var r=document.getElementsByTagName("script")[0];
        r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
        pintrk('load', '${tagId}');
        pintrk('page');
      `}
    </Script>
  )
}
