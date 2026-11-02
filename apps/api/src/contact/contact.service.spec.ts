import { Test, TestingModule } from '@nestjs/testing'
import { EmailService } from '../email/email.service'
import { ContactMessageDedupStore } from './contact-message-dedup.store'
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
      providers: [
        ContactService,
        { provide: EmailService, useValue: mockEmailService },
        {
          provide: ContactMessageDedupStore,
          useValue: new ContactMessageDedupStore(60 * 60 * 1000),
        },
      ],
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

  describe('server-side dedup within 1h window (#576)', () => {
    const identicalDto = {
      name: 'Jane',
      email: 'jane@example.com',
      subject: 'Order question',
      message: 'I have a question about my order.',
    } as const

    it('calls sendContactMessage once when two identical submissions arrive back-to-back', async () => {
      await contactService.sendMessage(identicalDto)
      await contactService.sendMessage(identicalDto)

      expect(mockSendContactMessage).toHaveBeenCalledTimes(1)
    })

    it('treats case-only / whitespace-only email variants as duplicates', async () => {
      await contactService.sendMessage(identicalDto)
      await contactService.sendMessage({ ...identicalDto, email: 'JANE@example.com' })

      expect(mockSendContactMessage).toHaveBeenCalledTimes(1)
    })

    it('sends again when the sender email differs', async () => {
      await contactService.sendMessage(identicalDto)
      await contactService.sendMessage({ ...identicalDto, email: 'another@example.com' })

      expect(mockSendContactMessage).toHaveBeenCalledTimes(2)
    })

    it('sends again when the message body differs', async () => {
      await contactService.sendMessage(identicalDto)
      await contactService.sendMessage({ ...identicalDto, message: 'Different question.' })

      expect(mockSendContactMessage).toHaveBeenCalledTimes(2)
    })

    it('silent-drops: duplicate still resolves successfully (controller returns 204, not 429)', async () => {
      await contactService.sendMessage(identicalDto)
      await expect(contactService.sendMessage(identicalDto)).resolves.toBeUndefined()
    })
  })
})
