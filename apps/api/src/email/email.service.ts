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
import {
  buildPasswordResetEmail,
  type PasswordResetEmailData,
} from './templates/password-reset.template'
import { buildWelcomeEmail, type WelcomeEmailData } from './templates/welcome.template'
import {
  buildContactMessageEmail,
  type ContactMessageEmailData,
} from './templates/contact-message.template'

// TODO: replace with verified domain address after DNS setup (e.g. orders@yourdomain.com)
const FROM_ADDRESS = 'onboarding@resend.dev'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly resend: Resend

  constructor(private readonly configService: ConfigService) {
    // In dev/test environments RESEND_API_KEY may be absent — Resend SDK accepts any string
    // and all failures are caught in send(), so the app starts and emails silently no-op.
    const apiKey = this.configService.get<string>('RESEND_API_KEY') ?? 'dev_no_op'
    this.resend = new Resend(apiKey)
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

  async sendPasswordReset(data: PasswordResetEmailData): Promise<void> {
    const { subject, html } = buildPasswordResetEmail(data)
    await this.send({ to: data.recipientEmail, subject, html })
  }

  async sendRefundProcessed(data: RefundProcessedData): Promise<void> {
    const { subject, html } = buildRefundProcessedEmail(data)
    await this.send({ to: data.recipientEmail, subject, html })
  }

  async sendContactMessage(data: ContactMessageEmailData): Promise<void> {
    const { subject, html } = buildContactMessageEmail(data)
    // Reply-To set to the sender so the store owner can reply directly from their inbox
    const ownerEmail = this.configService.get<string>('STORE_OWNER_EMAIL') ?? 'owner@example.com'
    await this.send({ to: ownerEmail, subject, html, replyTo: data.senderEmail })
  }

  private async send(params: {
    to: string
    subject: string
    html: string
    replyTo?: string
  }): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: FROM_ADDRESS,
        to: params.to,
        subject: params.subject,
        html: params.html,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
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
