# resend-template (custom)

**Effort:** low. **Impact:** medium.

## Что делает

Скаффолд React Email шаблон + перевод во все 3 локали + интеграция в `apps/api/src/email/`:
- React Email компонент в `apps/api/src/email/templates/`
- Локализованный текст через next-intl-compatible API
- Resend send helper в `EmailService`
- Spec для шаблона (rendering test)

## Trigger

- User: `/email-template order-confirmation`

## SKILL.md

````markdown
---
name: resend-template
description: Use when adding a new transactional email (order confirmation, password reset, shipping notification). Generates a React Email template in apps/api/src/email/templates/, localizes for EN/RU/ES, wires into EmailService with a typed send helper, and adds a rendering test.
---

# resend-template

## Inputs

1. **Template name** — kebab-case (`order-confirmation`, `password-reset`, `shipping-shipped`).
2. **Payload type** — what data the template needs.
3. **Subject lines** — per locale (or invoke i18n-sync after).

## Files created

```
apps/api/src/email/templates/<name>/
├── <name>.tsx              # React Email template
├── <name>.spec.tsx         # Rendering test
└── <name>.preview.tsx      # Preview data (dev only)

apps/api/src/email/email.service.ts    # add send<Name> method
```

## Template (React Email)

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface OrderConfirmationEmailProps {
  customerName: string
  orderId: string
  orderItems: { name: string; quantity: number; priceCents: number }[]
  totalCents: number
  currency: 'USD' | 'EUR' | 'RUB'
  locale: 'en' | 'ru' | 'es'
  trackingUrl?: string
}

export function OrderConfirmationEmail({
  customerName,
  orderId,
  orderItems,
  totalCents,
  currency,
  locale,
  trackingUrl,
}: OrderConfirmationEmailProps) {
  const t = getEmailTranslations(locale, 'orderConfirmation')

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{t('preview', { orderId })}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f6f6f6' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#fff', padding: 24 }}>
          <Img src="https://handmade-jewelry.com/logo.png" width={120} alt="Handmade Jewelry" />
          <Heading>{t('greeting', { name: customerName })}</Heading>
          <Text>{t('thankYou')}</Text>
          <Section>
            <Heading as="h2">{t('orderDetails')}</Heading>
            <Text>{t('orderNumber')}: <strong>#{orderId}</strong></Text>
            {orderItems.map((item) => (
              <Text key={item.name}>
                {item.quantity} × {item.name} — {formatEmailPrice(item.priceCents, currency, locale)}
              </Text>
            ))}
            <Text><strong>{t('total')}: {formatEmailPrice(totalCents, currency, locale)}</strong></Text>
          </Section>
          {trackingUrl && (
            <Section>
              <Button href={trackingUrl} style={buttonStyle}>
                {t('trackOrder')}
              </Button>
            </Section>
          )}
          <Text style={footerStyle}>{t('signature')}</Text>
        </Container>
      </Body>
    </Html>
  )
}

const buttonStyle = {
  backgroundColor: '#000',
  color: '#fff',
  padding: '12px 24px',
  borderRadius: 4,
  textDecoration: 'none',
}

const footerStyle = {
  fontSize: 12,
  color: '#666',
  marginTop: 32,
}
```

## EmailService helper

```ts
async sendOrderConfirmation(
  to: string,
  props: OrderConfirmationEmailProps,
): Promise<void> {
  const html = await render(<OrderConfirmationEmail {...props} />)
  const subject = getEmailTranslations(props.locale, 'orderConfirmation')('subject')

  await this.resend.emails.send({
    from: 'orders@handmade-jewelry.com',
    to,
    subject,
    html,
    tags: [
      { name: 'type', value: 'transactional' },
      { name: 'template', value: 'order-confirmation' },
    ],
  })
}
```

## Translations

For each template — add to `apps/api/src/email/messages/<locale>.json`:

```json
{
  "orderConfirmation": {
    "subject": "Your order #{orderId} confirmed",
    "preview": "Order #{orderId} confirmed",
    "greeting": "Hi {name},",
    "thankYou": "Thank you for your order!",
    "orderDetails": "Order details",
    "orderNumber": "Order #",
    "total": "Total",
    "trackOrder": "Track your order",
    "signature": "—\nHandmade Jewelry Team"
  }
}
```

Then invoke `/i18n-sync` for RU/ES.

## Hard rules

1. **Localized** for EN/RU/ES at minimum
2. **No inline images** — use absolute URLs
3. **Plain-text fallback** — Resend generates from HTML automatically, but verify
4. **`tags`** on every send — for analytics
5. **No PII in subject line** — order ID OK, customer name NO
6. **Test rendering** with sample data

## Источник

- docs/runbooks/resend-setup.md (если есть, иначе создать)
- docs/16_USER_ANALYTICS.md (Klaviyo flows table — Resend для transactional)
- React Email docs
````

## Зависимости

- `resend` SDK
- `@react-email/components`
- `@react-email/render`

## Источник

- Resend docs
