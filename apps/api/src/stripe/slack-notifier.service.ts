import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface DisputeSlackPayload {
  disputeId: string
  chargeId: string
  orderId: string
  amountUsd: number
  reason: string | null
  adminUrl: string
}

@Injectable()
export class SlackNotifierService {
  private readonly logger = new Logger(SlackNotifierService.name)

  constructor(private readonly configService: ConfigService) {}

  // Best-effort — Slack outages must not block webhook processing. A missing
  // SLACK_WEBHOOK_URL is silent (dev / self-hosted deployments don't require Slack).
  async sendDisputeAlert(payload: DisputeSlackPayload): Promise<void> {
    const webhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL')
    if (!webhookUrl) return

    const shortOrderId = payload.orderId.slice(-8).toUpperCase()
    const amountFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(payload.amountUsd)

    const body = {
      text: `:rotating_light: Chargeback dispute on order #${shortOrderId} — ${amountFormatted}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Chargeback dispute filed* :rotating_light:\nOrder \`#${shortOrderId}\` is now *ON_HOLD*. Respond in Stripe before the deadline.`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Amount:*\n${amountFormatted}` },
            { type: 'mrkdwn', text: `*Reason:*\n${payload.reason ?? 'unspecified'}` },
            { type: 'mrkdwn', text: `*Charge:*\n\`${payload.chargeId}\`` },
            { type: 'mrkdwn', text: `*Dispute:*\n\`${payload.disputeId}\`` },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Review in admin' },
              url: payload.adminUrl,
              style: 'primary',
            },
          ],
        },
      ],
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        this.logger.error(`Slack notification failed: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      this.logger.error(
        `Slack notification network error: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}
