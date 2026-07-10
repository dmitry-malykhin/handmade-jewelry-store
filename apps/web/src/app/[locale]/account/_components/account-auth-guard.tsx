'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from '@/i18n/navigation'

interface AccountAuthGuardProps {
  children: React.ReactNode
}

// Placeholder (not `null`) reserves viewport height so the footer doesn't
// jump when children replace it — was CLS 0.92 on /account/* pre-hydration.
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
    return <div aria-hidden="true" className="min-h-screen" />
  }

  return <>{children}</>
}
