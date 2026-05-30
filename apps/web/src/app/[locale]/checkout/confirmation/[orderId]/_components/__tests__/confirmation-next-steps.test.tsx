import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../../../../../../messages/en.json'
import { ConfirmationNextSteps } from '../confirmation-next-steps'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

function renderWithIntl(component: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {component}
    </NextIntlClientProvider>,
  )
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('confirmation-next-steps')
  await $allureSeverity('normal')
})

describe('ConfirmationNextSteps', () => {
  it('renders the section heading', () => {
    renderWithIntl(<ConfirmationNextSteps />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('What happens next')
  })

  it('renders all 4 steps', () => {
    renderWithIntl(<ConfirmationNextSteps />)
    expect(screen.getByText('Order Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Being Handcrafted')).toBeInTheDocument()
    expect(screen.getByText('Quality Check')).toBeInTheDocument()
    expect(screen.getByText('On Its Way')).toBeInTheDocument()
  })

  it('renders the handcrafting step description', () => {
    renderWithIntl(<ConfirmationNextSteps />)
    expect(screen.getByText(/carefully made by hand/i)).toBeInTheDocument()
  })
})
