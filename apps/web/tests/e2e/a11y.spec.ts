import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

// Axe scan for the 5 highest-traffic pages. WCAG 2.1 AA — the level Google
// Shopping and most compliance policies target. Serious + critical violations
// fail the build; minor/moderate ones surface as warnings in the report.
const CRITICAL_PAGES = [
  { path: '/en', label: 'home' },
  { path: '/en/products', label: 'catalog' },
  { path: '/en/cart', label: 'cart' },
  { path: '/en/account', label: 'account' },
  { path: '/en/search', label: 'search' },
] as const

test.describe('Axe a11y scan', () => {
  for (const { path, label } of CRITICAL_PAGES) {
    test(`${label} (${path}) has no serious or critical WCAG 2.1 AA violations`, async ({
      page,
    }) => {
      await page.goto(path)

      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      const seriousViolations = scan.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      )

      expect(
        seriousViolations,
        `${label} axe scan found ${seriousViolations.length} serious/critical violations:\n` +
          seriousViolations
            .map(
              (violation) =>
                `  - [${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length} node(s))`,
            )
            .join('\n'),
      ).toHaveLength(0)
    })
  }
})
