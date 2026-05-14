# TC-EMAIL-003: Order Confirmation — Resend API key invalid → webhook survives

- **Priority:** P0
- **Type:** Manual
- **Why:** A broken email integration must never roll back a successful payment. The webhook must always return `200` so Stripe stops retrying.

## Preconditions
- Local API running

## Steps
1. Set `RESEND_API_KEY=re_invalid` in `apps/api/.env`
2. Restart the API
3. Complete the happy path from [TC-EMAIL-001](TC-EMAIL-001.md)

## Expected result
- API log includes `ERROR Failed to send email`
- Webhook returns `200`
- Stripe CLI shows no retries
- `order.status = PAID` in the database
