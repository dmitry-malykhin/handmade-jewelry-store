import { Injectable, Logger } from '@nestjs/common'
import * as Sentry from '@sentry/nestjs'
import { EmailService } from '../email/email.service'
import { ContactMessageDedupStore } from './contact-message-dedup.store'
import type { SendContactMessageDto } from './dto/send-contact-message.dto'

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name)

  constructor(
    private readonly emailService: EmailService,
    private readonly dedupStore: ContactMessageDedupStore,
  ) {}

  async sendMessage(dto: SendContactMessageDto): Promise<void> {
    const fingerprint = ContactMessageDedupStore.fingerprintOf(dto.email, dto.subject, dto.message)

    // Silent-drop so the attacker can't tell whether the dedup fired — a
    // 429/409 would leak that an identical message was already queued.
    if (this.dedupStore.seenRecently(fingerprint)) {
      this.logger.warn(`contact.duplicate ${dto.email}`)
      Sentry.addBreadcrumb({
        category: 'contact',
        type: 'info',
        level: 'warning',
        message: 'contact.duplicate',
        data: { email: dto.email, subject: dto.subject },
      })
      return
    }

    this.dedupStore.remember(fingerprint)

    await this.emailService.sendContactMessage({
      senderName: dto.name,
      senderEmail: dto.email,
      subject: dto.subject,
      message: dto.message,
    })
  }
}
