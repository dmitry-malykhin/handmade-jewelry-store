'use client'

import { useTranslations } from 'next-intl'

interface SkipToContentLinkProps {
  targetId: string
}

export function SkipToContentLink({ targetId }: SkipToContentLinkProps) {
  const t = useTranslations('header')

  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {t('skipToMain')}
    </a>
  )
}
