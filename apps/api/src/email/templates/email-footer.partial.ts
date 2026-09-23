import { escapeHtml } from './escape-html'
import { getStoreIdentity, type StoreIdentity } from '../../common/config/store-identity'

export interface EmailFooterOptions {
  // 'marketing' renders an unsubscribe line (CAN-SPAM/GDPR/PECR mandatory).
  // 'transactional' omits it: order confirmations don't need an opt-out.
  variant: 'marketing' | 'transactional'
  unsubscribeUrl?: string
}

// Shared brand + legal footer for every email we send. Includes the sender's
// legal name and postal address on every variant (CAN-SPAM §7704(a)(5)). The
// unsubscribe line is only rendered for marketing emails, and requires a
// working token-based unsubscribeUrl or the render throws: a marketing email
// without a working unsubscribe would violate CAN-SPAM by itself.
export function renderEmailFooter(options: EmailFooterOptions): string {
  const identity = getStoreIdentity()
  const address = buildAddressBlock(identity)

  if (options.variant === 'marketing') {
    if (!options.unsubscribeUrl) {
      throw new Error('renderEmailFooter: marketing variant requires unsubscribeUrl')
    }
    return renderMarketingFooter(address, options.unsubscribeUrl, identity.legalName)
  }

  return renderTransactionalFooter(address, identity.legalName)
}

function buildAddressBlock(identity: StoreIdentity): string {
  const line1 = escapeHtml(identity.addressLine1)
  const line2 = identity.addressLine2 ? `<br>${escapeHtml(identity.addressLine2)}` : ''
  const cityLine = escapeHtml(`${identity.postalCode} ${identity.city}`)
  const country = escapeHtml(identity.country)
  return `${line1}${line2}<br>${cityLine}<br>${country}`
}

function renderMarketingFooter(address: string, unsubscribeUrl: string, legalName: string): string {
  return `
<tr><td style="padding: 24px 40px; border-top: 1px solid #f0f0f0;">
  <p style="margin: 0 0 8px; font-size: 12px; color: #666; text-align: center;">
    <a href="${escapeHtml(unsubscribeUrl)}" style="color: #666; text-decoration: underline;">Unsubscribe from marketing emails</a>
  </p>
  <p style="margin: 0 0 4px; font-size: 12px; color: #aaa; text-align: center;">
    ${escapeHtml(legalName)}
  </p>
  <p style="margin: 0; font-size: 11px; color: #aaa; text-align: center; line-height: 1.5;">
    ${address}
  </p>
</td></tr>`
}

function renderTransactionalFooter(address: string, legalName: string): string {
  return `
<tr><td style="padding: 24px 40px; border-top: 1px solid #f0f0f0;">
  <p style="margin: 0 0 4px; font-size: 12px; color: #aaa; text-align: center;">
    ${escapeHtml(legalName)}
  </p>
  <p style="margin: 0; font-size: 11px; color: #aaa; text-align: center; line-height: 1.5;">
    ${address}
  </p>
</td></tr>`
}
