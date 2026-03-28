import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'
import {
  buildOrderConfirmationEmail,
  type OrderConfirmationData,
} from './templates/order-confirmation.template'
import {
  buildRefundProcessedEmail,
  type RefundProcessedData,
} from './templates/refund-processed.template'
import {
  buildShippingNotificationEmail,
  type ShippingNotificationData,
} from './templates/shipping-notification.template'
import { buildWelcomeEmail, type WelcomeEmailData } from './templates/welcome.template'

const FROM_ADDRESS = 'orders@jewelry.com'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly resend: Resend

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.getOrThrow<string>('RESEND_API_KEY'))
  }

  async sendOrderConfirmation(data: OrderConfirmationData): Promise<void> {
    const { subject, html } = buildOrderConfirmationEmail(data)
    await this.send({ to: data.recipientEmail, subject, html })
  }

  async sendWelcome(data: WelcomeEmailData): Promise<void> {
    const { subject, html } = buildWelcomeEmail(data)
    await this.send({ to: data.recipientEmail, subject, html })
  }

  async sendShippingNotification(data: ShippingNotificationData): Promise<void> {
    const { subject, html } = buildShippingNotificationEmail(data)
    await this.send({ to: data.recipientEmail, subject, html })
  }

  async sendRefundProcessed(data: RefundProcessedData): Promise<void> {
    const { subject, html } = buildRefundProcessedEmail(data)
    await this.send({ to: data.recipientEmail, subject, html })
  }

  private async send(params: { to: string; subject: string; html: string }): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: FROM_ADDRESS,
        to: params.to,
        subject: params.subject,
        html: params.html,
      })

      if (error) {
        this.logger.error(`Failed to send email to ${params.to}: ${error.message}`)
        return
      }

      this.logger.log(`Email sent to ${params.to} — "${params.subject}"`)
    } catch (error) {
      // Email failures must never crash the main business flow
      this.logger.error(`Unexpected error sending email to ${params.to}`, error)
    }
  }
}
