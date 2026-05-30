import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test-utils'
import { EmptyCart } from '../empty-cart'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}))

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('empty-cart')
  await $allureSeverity('normal')
})

describe('EmptyCart', () => {
  it('renders the empty cart heading', () => {
    render(<EmptyCart />)

    expect(screen.getByRole('heading', { name: /your cart is empty/i })).toBeInTheDocument()
  })

  it('renders a link to the shop', () => {
    render(<EmptyCart />)

    expect(screen.getByRole('link', { name: /continue shopping/i })).toHaveAttribute(
      'href',
      '/shop',
    )
  })
})
