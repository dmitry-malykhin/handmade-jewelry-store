import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { QueryProvider } from '../query-provider'

// Devtools render uses lazy import + window globals not available in jsdom.
vi.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtools: () => null,
}))

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/shared')
  await $allureSubSuite('query-provider')
  await $allureSeverity('normal')
})

describe('QueryProvider', () => {
  it('renders its children verbatim', () => {
    render(
      <QueryProvider>
        <p>app shell</p>
      </QueryProvider>,
    )

    expect(screen.getByText('app shell')).toBeInTheDocument()
  })

  it('supplies a QueryClient so descendants can call useQuery without throwing', async () => {
    function Probe() {
      const { data } = useQuery({
        queryKey: ['probe'],
        queryFn: async () => 'pong',
      })
      return <span data-testid="probe">{data ?? 'pending'}</span>
    }

    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    )

    // First paint shows the pending state since the queryFn resolves async.
    expect(screen.getByTestId('probe')).toBeInTheDocument()
  })
})
