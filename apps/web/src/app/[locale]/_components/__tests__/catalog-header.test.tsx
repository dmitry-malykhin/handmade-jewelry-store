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
  it('renders the title as h1', () => {
    render(<CatalogHeader title="Rings" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Rings' })).toBeInTheDocument()
  })

  it('applies the font-display utility to the catalog h1', () => {
    render(<CatalogHeader title="Rings" />)
    const heading = screen.getByRole('heading', { level: 1, name: 'Rings' })
    expect(heading.className).toContain('font-display')
  })
})
