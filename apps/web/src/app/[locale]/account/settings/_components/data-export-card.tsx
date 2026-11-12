'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadDataExport } from '@/lib/api/users'
import { ApiError } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth.store'

export function DataExportCard() {
  const t = useTranslations('account.settings.dataExport')
  const accessToken = useAuthStore((state) => state.accessToken)
  const [isLoading, setIsLoading] = useState(false)

  async function handleClick() {
    if (!accessToken) {
      toast.error(t('errorUnauthorized'))
      return
    }
    setIsLoading(true)
    try {
      const { blob, filename } = await downloadDataExport(accessToken)
      // Browser-side save: object URL + synthetic anchor. Revoke after click
      // so the Blob can be garbage-collected once the download starts.
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(objectUrl)
      toast.success(t('success'))
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t('errorGeneric')
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section
      aria-labelledby="data-export-heading"
      className="space-y-4 rounded-lg border border-border bg-card p-6"
    >
      <div>
        <h3 id="data-export-heading" className="text-lg font-medium text-foreground">
          {t('title')}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <Button type="button" variant="outline" onClick={handleClick} disabled={isLoading}>
        {isLoading ? t('downloadingButton') : t('downloadButton')}
      </Button>
    </section>
  )
}
