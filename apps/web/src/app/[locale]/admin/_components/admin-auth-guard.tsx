'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from '@/i18n/navigation'

interface AdminAuthGuardProps {
  children: React.ReactNode
}

// Tokens live in localStorage via Zustand persist, so role checks must happen
// client-side AFTER hydration — the isHydrated gate blocks a premature redirect
// before StoreHydration's rehydrate() runs.
export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.role)
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated && (!isAuthenticated || role !== 'ADMIN')) {
      router.replace('/')
    }
  }, [isHydrated, isAuthenticated, role, router])

  if (!isHydrated || !isAuthenticated || role !== 'ADMIN') {
    return <div aria-hidden="true" className="min-h-screen" />
  }

  return <>{children}</>
}
