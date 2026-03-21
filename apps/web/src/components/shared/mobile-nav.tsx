'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const NAV_LINKS = [
  { label: 'Shop', href: '/shop' },
  { label: 'Collections', href: '/collections' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

/**
 * Mobile navigation — the ONLY Client Component in the header.
 * 'use client' is scoped here so the parent Header stays a Server Component.
 * Handles open/close state for the mobile menu panel.
 */
export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {isOpen && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-16 z-50 border-b bg-background px-4 py-6 shadow-sm"
        >
          <nav aria-label="Mobile navigation">
            <ul role="list" className="flex flex-col gap-4">
              {NAV_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="block text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setIsOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  )
}
