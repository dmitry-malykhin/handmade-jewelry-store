import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../../../../../../messages/en.json'
import { ConfirmationSuccessHeader } from '../confirmation-success-header'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const ORDER_ID = 'cmn9h19k8000i1djemmcs10tz'

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
  await $allureSubSuite('confirmation-success-header')
  await $allureSeverity('normal')
})

describe('ConfirmationSuccessHeader', () => {
  it('displays the order title', () => {
    renderWithIntl(<ConfirmationSuccessHeader orderId={ORDER_ID} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Thank you for your order!')
  })

  it('displays the order ID', () => {
    renderWithIntl(<ConfirmationSuccessHeader orderId={ORDER_ID} />)
    expect(screen.getByText(ORDER_ID)).toBeInTheDocument()
  })

  it('displays the email confirmation note', () => {
    renderWithIntl(<ConfirmationSuccessHeader orderId={ORDER_ID} />)
    expect(screen.getByText(/confirmation email/i)).toBeInTheDocument()
  })
})
