import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import { CatalogHeader } from '../catalog-header'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/catalog')
  await $allureSubSuite('catalog-header')
  await $allureSeverity('normal')
})

describe('CatalogHeader', () => {
  it('renders title and product count', () => {
    render(<CatalogHeader title="Rings" productsCount="42 products" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Rings' })).toBeInTheDocument()
    expect(screen.getByText('42 products')).toBeInTheDocument()
  })

  it('applies the font-display utility to the catalog h1', () => {
    render(<CatalogHeader title="Rings" productsCount="42 products" />)
    const heading = screen.getByRole('heading', { level: 1, name: 'Rings' })
    expect(heading.className).toContain('font-display')
  })
})
