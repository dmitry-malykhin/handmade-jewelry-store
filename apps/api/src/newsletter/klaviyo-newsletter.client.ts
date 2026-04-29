import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api'
// Pinned per Klaviyo's stability policy — bumping it is an intentional decision.
const KLAVIYO_API_REVISION = '2024-10-15'

export interface SubscribeResult {
  // 'queued' = Klaviyo accepted; double opt-in confirmation email is dispatched if the list is so configured.
  // 'skipped' = no Klaviyo credentials in the environment, the call was a no-op (dev/test).
  status: 'queued' | 'skipped'
}

@Injectable()
export class KlaviyoNewsletterClient {
  private readonly logger = new Logger(KlaviyoNewsletterClient.name)

  constructor(private readonly configService: ConfigService) {}

  async subscribeEmail(email: string): Promise<SubscribeResult> {
    const apiKey = this.configService.get<string>('KLAVIYO_PRIVATE_API_KEY')
    const listId = this.configService.get<string>('KLAVIYO_NEWSLETTER_LIST_ID')

    if (!apiKey || !listId) {
      // Dev/test path: the form must still feel "successful" to the user, otherwise local
      // QA gets blocked. The warning is loud enough that a missing prod env var won't hide.
      this.logger.warn(
        'Klaviyo credentials missing — newsletter subscription not forwarded (dev/test no-op)',
      )
      return { status: 'skipped' }
    }

    const response = await fetch(`${KLAVIYO_API_BASE}/profile-subscription-bulk-create-jobs/`, {
      method: 'POST',
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
        revision: KLAVIYO_API_REVISION,
        // Cloudflare WAF in front of Klaviyo blocks requests without a UA (default Node fetch
        // sends no User-Agent → 403). Identify our integration explicitly.
        'User-Agent': 'Senichka-Newsletter/1.0',
      },
      body: JSON.stringify({
        data: {
          type: 'profile-subscription-bulk-create-job',
          attributes: {
            custom_source: 'Newsletter Signup',
            profiles: {
              data: [
                {
                  type: 'profile',
                  attributes: {
                    email,
                    subscriptions: {
                      email: { marketing: { consent: 'SUBSCRIBED' } },
                    },
                  },
                },
              ],
            },
            historical_import: false,
          },
          relationships: {
            list: { data: { type: 'list', id: listId } },
          },
        },
      }),
    })

    // 202 Accepted is the success path — Klaviyo enqueues the subscription job.
    if (response.status === 202) {
      return { status: 'queued' }
    }

    const errorBody = await response.text().catch(() => '')
    this.logger.error(
      `Klaviyo subscribe failed: status=${response.status} body=${errorBody.slice(0, 500)}`,
    )
    throw new ServiceUnavailableException('Newsletter provider unavailable')
  }
}
