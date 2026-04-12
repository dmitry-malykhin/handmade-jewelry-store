import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import messages from '../../../../../messages/en.json'
import AboutPage from '../page'

// next-intl/server — getTranslations accepts either a namespace string or { locale, namespace }
vi.mock('next-intl/server', () => ({
  getTranslations: async (namespaceOrOptions: string | { namespace: string; locale?: string }) => {
    const namespace =
      typeof namespaceOrOptions === 'string' ? namespaceOrOptions : namespaceOrOptions.namespace
    const ns = (messages as Record<string, Record<string, string>>)[namespace] ?? {}
    return (key: string) => ns[key] ?? key
  },
  setRequestLocale: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

async function renderAboutPage() {
  const jsx = await AboutPage({ params: Promise.resolve({ locale: 'en' }) })
  return render(jsx)
}

describe('AboutPage — structure', () => {
  it('renders the hero heading', async () => {
    await renderAboutPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Made by hand, worn with heart',
    )
  })

  it('renders the brand story section', async () => {
    await renderAboutPage()
    expect(screen.getByRole('heading', { name: 'Our Story', level: 2 })).toBeInTheDocument()
  })

  it('renders the handmade process section', async () => {
    await renderAboutPage()
    expect(
      screen.getByRole('heading', { name: 'How Each Piece Is Made', level: 2 }),
    ).toBeInTheDocument()
  })

  it('renders all 4 process steps', async () => {
    await renderAboutPage()
    expect(screen.getByText('Design')).toBeInTheDocument()
    expect(screen.getByText('Metalwork')).toBeInTheDocument()
    expect(screen.getByText('Stone Setting')).toBeInTheDocument()
    expect(screen.getByText('Finishing')).toBeInTheDocument()
  })

  it('renders the materials section', async () => {
    await renderAboutPage()
    expect(screen.getByRole('heading', { name: 'What We Use', level: 2 })).toBeInTheDocument()
  })

  it('renders all 3 material cards', async () => {
    await renderAboutPage()
    expect(screen.getByText('Sterling Silver')).toBeInTheDocument()
    expect(screen.getByText('Natural Gemstones')).toBeInTheDocument()
    expect(screen.getByText('Eco-Friendly Packaging')).toBeInTheDocument()
  })

  it('renders the values section', async () => {
    await renderAboutPage()
    expect(screen.getByRole('heading', { name: 'What We Believe', level: 2 })).toBeInTheDocument()
  })

  it('renders the Shop CTA link pointing to /shop', async () => {
    await renderAboutPage()
    const ctaLink = screen.getByRole('link', { name: 'Shop the Collection' })
    expect(ctaLink).toHaveAttribute('href', '/shop')
  })
})
