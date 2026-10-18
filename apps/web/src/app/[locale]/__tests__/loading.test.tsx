import { describe, it, expect, vi } from 'vitest'
import { render } from '@/test-utils'
import messagesEn from '../../../../messages/en.json'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespaceOrOptions: string | { namespace: string; locale?: string }) => {
    const namespace =
      typeof namespaceOrOptions === 'string' ? namespaceOrOptions : namespaceOrOptions.namespace
    const ns = (messagesEn as unknown as Record<string, Record<string, string>>)[namespace] ?? {}
    return (key: string) => ns[key] ?? key
  },
}))

const { default: ShopLoading } = await import('../loading')

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('loading')
  await $allureSeverity('normal')
})

describe('ShopLoading skeleton', () => {
  it('renders animated skeleton blocks', async () => {
    const { container } = render(await ShopLoading())
    const animatedBlocks = container.querySelectorAll('.animate-pulse')
    expect(animatedBlocks.length).toBeGreaterThan(0)
  })

  it('renders sidebar placeholder on large screens', async () => {
    const { container } = render(await ShopLoading())
    expect(container.querySelector('aside')).toBeInTheDocument()
  })

  it('exposes a localised accessible name for screen readers (#633)', async () => {
    const { container } = render(await ShopLoading())
    const landmark = container.querySelector('section[aria-label]')
    expect(landmark).not.toBeNull()
    expect(landmark?.getAttribute('aria-label')).toBeTruthy()
  })
})
