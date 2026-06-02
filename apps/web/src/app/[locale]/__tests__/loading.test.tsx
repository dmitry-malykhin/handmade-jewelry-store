import { describe, it, expect } from 'vitest'
import { render } from '@/test-utils'
import ShopLoading from '../loading'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('loading')
  await $allureSeverity('normal')
})

describe('ShopLoading skeleton', () => {
  it('renders animated skeleton blocks', () => {
    const { container } = render(<ShopLoading />)
    const animatedBlocks = container.querySelectorAll('.animate-pulse')
    expect(animatedBlocks.length).toBeGreaterThan(0)
  })

  it('renders sidebar placeholder on large screens', () => {
    const { container } = render(<ShopLoading />)
    // aside is present for the filter sidebar skeleton
    expect(container.querySelector('aside')).toBeInTheDocument()
  })
})
