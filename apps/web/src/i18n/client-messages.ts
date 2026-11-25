// #500: The full message catalog is ~1300 lines per locale; shipping all of
// it to every browser (including the admin namespace, ~500 lines) wasted TTI
// and JS payload on public routes that never render admin UI.
//
// Root layout trims these heavy, scoped namespaces before handing messages
// to NextIntlClientProvider. A layout that actually needs one of them (e.g.
// /admin) re-adds that namespace via an inner provider.

export const ADMIN_ONLY_NAMESPACES = ['admin'] as const

export type Messages = Record<string, unknown>

export function pickPublicClientMessages(messages: Messages): Messages {
  const copy: Messages = {}
  for (const key of Object.keys(messages)) {
    if (!(ADMIN_ONLY_NAMESPACES as readonly string[]).includes(key)) {
      copy[key] = messages[key]
    }
  }
  return copy
}
