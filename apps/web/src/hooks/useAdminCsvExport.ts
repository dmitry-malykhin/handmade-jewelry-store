import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth.store'
import { ApiError } from '@/lib/api/client'

interface UseAdminCsvExportOptions {
  download: (accessToken: string) => Promise<void>
}

export function useAdminCsvExport({ download }: UseAdminCsvExportOptions) {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    if (!accessToken) return
    setIsExporting(true)
    try {
      await download(accessToken)
      toast.success(t('exportCsvSuccess'))
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t('exportCsvError')
      toast.error(message)
    } finally {
      setIsExporting(false)
    }
  }

  return {
    isExporting,
    handleExport,
    isExportDisabled: isExporting || !accessToken,
  }
}
