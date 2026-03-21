'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

/**
 * Thin wrapper around next-themes ThemeProvider.
 * Kept as a separate file so the root layout (Server Component) can import it
 * without pulling 'use client' into the server tree.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
