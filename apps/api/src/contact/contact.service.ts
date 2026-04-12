import { Injectable } from '@nestjs/common'
import { EmailService } from '../email/email.service'
import type { SendContactMessageDto } from './dto/send-contact-message.dto'

@Injectable()
export class ContactService {
  constructor(private readonly emailService: EmailService) {}

  async sendMessage(dto: SendContactMessageDto): Promise<void> {
    await this.emailService.sendContactMessage({
      senderName: dto.name,
      senderEmail: dto.email,
      subject: dto.subject,
      message: dto.message,
    })
  }
}
