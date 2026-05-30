import { Test, TestingModule } from '@nestjs/testing'
import { EmailService } from '../email/email.service'
import { ContactService } from './contact.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const mockSendContactMessage = jest.fn().mockResolvedValue(undefined)

const mockEmailService = {
  sendContactMessage: mockSendContactMessage,
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/contact')
  await $allureSubSuite('contact.service')
  await $allureSeverity('normal')
})

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
