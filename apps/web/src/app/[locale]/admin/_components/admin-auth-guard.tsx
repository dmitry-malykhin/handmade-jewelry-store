'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from '@/i18n/navigation'

interface AdminAuthGuardProps {
  children: React.ReactNode
}

/**
 * Client-side ADMIN role guard.
 * Tokens live in localStorage (Zustand persist), so role checks must happen
 * on the client after hydration — not in Server Components or middleware.
 * Redirects non-authenticated and non-ADMIN users to the home page.
 *
 * isHydrated flag prevents premature redirect before Zustand rehydrates from
 * localStorage — without it the guard sees isAuthenticated=false on first render
 * and redirects before StoreHydration's useEffect fires.
 */
export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.role)
  const router = useRouter()
  // Start as hydrated=false to block redirect until client useEffect runs
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Mark hydrated after first client render — by this point StoreHydration's
    // useEffect has already called rehydrate(), so auth state is populated
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated && (!isAuthenticated || role !== 'ADMIN')) {
      router.replace('/')
    }
  }, [isHydrated, isAuthenticated, role, router])

  if (!isHydrated || !isAuthenticated || role !== 'ADMIN') {
    return null
  }

  return <>{children}</>
}
