import { Test, TestingModule } from '@nestjs/testing'
import { EmailService } from '../email/email.service'
import { ContactService } from './contact.service'

const mockSendContactMessage = jest.fn().mockResolvedValue(undefined)

const mockEmailService = {
  sendContactMessage: mockSendContactMessage,
}

describe('ContactService', () => {
  let contactService: ContactService

  beforeEach(async () => {
    mockSendContactMessage.mockClear()

    const module: TestingModule = await Test.createTestingModule({
      providers: [ContactService, { provide: EmailService, useValue: mockEmailService }],
    }).compile()

    contactService = module.get<ContactService>(ContactService)
  })

  it('calls sendContactMessage with mapped fields from the DTO', async () => {
    await contactService.sendMessage({
      name: 'Jane Smith',
      email: 'jane@example.com',
      subject: 'Order question',
      message: 'I have a question about my order.',
    })

    expect(mockSendContactMessage).toHaveBeenCalledWith({
      senderName: 'Jane Smith',
      senderEmail: 'jane@example.com',
      subject: 'Order question',
      message: 'I have a question about my order.',
    })
  })

  it('propagates errors thrown by EmailService', async () => {
    mockSendContactMessage.mockRejectedValueOnce(new Error('Resend unavailable'))

    await expect(
      contactService.sendMessage({
        name: 'Jane',
        email: 'jane@example.com',
        subject: 'Test',
        message: 'Test message here.',
      }),
    ).rejects.toThrow('Resend unavailable')
  })
})
