interface Window {
  gtag?: (command: string, ...args: unknown[]) => void
  dataLayer?: Record<string, unknown>[]
}
