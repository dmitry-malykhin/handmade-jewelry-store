import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { MarkdownRenderer } from '../markdown-renderer'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/admin')
  await $allureSubSuite('markdown-renderer')
  await $allureSeverity('normal')
})

describe('MarkdownRenderer', () => {
  it('renders headings as semantic h1/h2', () => {
    render(<MarkdownRenderer content={'# Title\n\n## Section'} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Section' })).toBeInTheDocument()
  })

  it('renders inline code with the <code> element', () => {
    render(<MarkdownRenderer content={'Use `pnpm install`.'} />)

    expect(screen.getByText('pnpm install').tagName).toBe('CODE')
  })

  it('opens external https:// links in a new tab with rel="noopener noreferrer"', () => {
    render(<MarkdownRenderer content={'[Senichka](https://senichka.com)'} />)

    const externalLink = screen.getByRole('link', { name: 'Senichka' })
    expect(externalLink).toHaveAttribute('target', '_blank')
    expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('leaves relative links without target / rel attributes', () => {
    render(<MarkdownRenderer content={'[Account](/account)'} />)

    const internalLink = screen.getByRole('link', { name: 'Account' })
    expect(internalLink).not.toHaveAttribute('target')
    expect(internalLink).not.toHaveAttribute('rel')
  })

  it('renders GFM tables via remarkGfm', () => {
    const tableMarkdown = `
| Column A | Column B |
|----------|----------|
| Cell 1   | Cell 2   |
`.trim()
    render(<MarkdownRenderer content={tableMarkdown} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Cell 1' })).toBeInTheDocument()
  })
})
