'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from '@/i18n/navigation'

interface AccountAuthGuardProps {
  children: React.ReactNode
}

/**
 * Client-side authentication guard for /account/* routes.
 * Redirects unauthenticated users to /login.
 * isHydrated flag prevents premature redirect before Zustand rehydrates from
 * localStorage — same pattern as AdminAuthGuard.
 */
export function AccountAuthGuard({ children }: AccountAuthGuardProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isHydrated, isAuthenticated, router])

  if (!isHydrated || !isAuthenticated) {
    return null
  }

  return <>{children}</>
}
