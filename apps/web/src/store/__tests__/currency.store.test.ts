import { describe, it, expect, beforeEach } from 'vitest'
import { useCurrencyStore } from '../currency.store'

beforeEach(() => {
  useCurrencyStore.setState({ displayCurrency: 'USD' })
})

describe('useCurrencyStore — initial state', () => {
  it('defaults to USD — primary market is US', () => {
    expect(useCurrencyStore.getState().displayCurrency).toBe('USD')
  })
})

describe('useCurrencyStore — setDisplayCurrency', () => {
  it('switches to CAD', () => {
    useCurrencyStore.getState().setDisplayCurrency('CAD')
    expect(useCurrencyStore.getState().displayCurrency).toBe('CAD')
  })

  it('switches to GBP', () => {
    useCurrencyStore.getState().setDisplayCurrency('GBP')
    expect(useCurrencyStore.getState().displayCurrency).toBe('GBP')
  })

  it('switches back to USD from another currency', () => {
    useCurrencyStore.setState({ displayCurrency: 'CAD' })
    useCurrencyStore.getState().setDisplayCurrency('USD')
    expect(useCurrencyStore.getState().displayCurrency).toBe('USD')
  })
})
