import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import { ContactForm } from '../contact-form'

const VALID_FORM = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  subject: 'Order question',
  message: 'I have a question about my recent order.',
}

describe('ContactForm — rendering', () => {
  it('renders all four fields', () => {
    render(<ContactForm />)
    expect(screen.getByLabelText('Your name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Subject')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    render(<ContactForm />)
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument()
  })

  it('does not show any errors on initial render', () => {
    render(<ContactForm />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('ContactForm — client-side validation', () => {
  it('shows name error when name is empty on submit', async () => {
    render(<ContactForm />)
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
  })

  it('shows email error when email is invalid on submit', async () => {
    render(<ContactForm />)
    await userEvent.type(screen.getByLabelText('Your name'), 'Jane')
    await userEvent.type(screen.getByLabelText('Email address'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument()
  })

  it('shows message error when message is shorter than 10 characters', async () => {
    render(<ContactForm />)
    await userEvent.type(screen.getByLabelText('Your name'), 'Jane')
    await userEvent.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await userEvent.type(screen.getByLabelText('Subject'), 'Test')
    await userEvent.type(screen.getByLabelText('Message'), 'Short')
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByText('Message must be at least 10 characters.')).toBeInTheDocument()
  })

  it('clears field error as user types in the field', async () => {
    render(<ContactForm />)
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByText('Name is required.')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Your name'), 'J')
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument()
  })
})

describe('ContactForm — successful submission', () => {
  it('shows success state after successful API call', async () => {
    render(<ContactForm />)

    await userEvent.type(screen.getByLabelText('Your name'), VALID_FORM.name)
    await userEvent.type(screen.getByLabelText('Email address'), VALID_FORM.email)
    await userEvent.type(screen.getByLabelText('Subject'), VALID_FORM.subject)
    await userEvent.type(screen.getByLabelText('Message'), VALID_FORM.message)
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))

    await waitFor(() => {
      expect(screen.getByText('Message sent!')).toBeInTheDocument()
    })
  })

  it('hides the form after successful submission', async () => {
    render(<ContactForm />)

    await userEvent.type(screen.getByLabelText('Your name'), VALID_FORM.name)
    await userEvent.type(screen.getByLabelText('Email address'), VALID_FORM.email)
    await userEvent.type(screen.getByLabelText('Subject'), VALID_FORM.subject)
    await userEvent.type(screen.getByLabelText('Message'), VALID_FORM.message)
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument()
    })
  })
})

describe('ContactForm — error handling', () => {
  beforeEach(() => {
    server.use(
      http.post('http://localhost:4000/api/contact', () => {
        return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 })
      }),
    )
  })

  it('shows generic error message when API returns a server error', async () => {
    render(<ContactForm />)

    await userEvent.type(screen.getByLabelText('Your name'), VALID_FORM.name)
    await userEvent.type(screen.getByLabelText('Email address'), VALID_FORM.email)
    await userEvent.type(screen.getByLabelText('Subject'), VALID_FORM.subject)
    await userEvent.type(screen.getByLabelText('Message'), VALID_FORM.message)
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    })
  })

  it('keeps the form visible after a failed API call', async () => {
    render(<ContactForm />)

    await userEvent.type(screen.getByLabelText('Your name'), VALID_FORM.name)
    await userEvent.type(screen.getByLabelText('Email address'), VALID_FORM.email)
    await userEvent.type(screen.getByLabelText('Subject'), VALID_FORM.subject)
    await userEvent.type(screen.getByLabelText('Message'), VALID_FORM.message)
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument()
    })
  })
})
