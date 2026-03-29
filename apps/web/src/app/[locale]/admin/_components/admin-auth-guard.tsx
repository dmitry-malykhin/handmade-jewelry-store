'use client'

import { useEffect } from 'react'
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
 */
export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.role)
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated || role !== 'ADMIN') {
      router.replace('/')
    }
  }, [isAuthenticated, role, router])

  if (!isAuthenticated || role !== 'ADMIN') {
    return null
  }

  return <>{children}</>
}
