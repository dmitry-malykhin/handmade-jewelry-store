# Customers

## What this is for

The customer list — every registered account, with at-a-glance metrics that
matter for retention (orders count, lifetime value, last order date).

This page does **not** include guests — guest checkouts are tracked on the
order itself, not as customer records. To find a guest, search by email in
the [orders](../orders/overview.md) page.

Use this page to:

- Identify VIPs by lifetime value
- Find lapsed customers (last order > N months ago) for win-back campaigns
- Open a single customer's profile for full history

## Fields & controls

### Search
- **Purpose**: Find a customer by email substring.
- **How to fill**: Type any part of the email. Case-insensitive.
  Debounced 300ms so typing doesn't hammer the API.
- **Consequences**: Page resets to 1, table re-queries.
- **Tip**: Search by domain (`@gmail.com`) to find all Gmail users; useful
  when investigating delivery issues on a specific provider.

### Columns

| Column | Meaning |
|---|---|
| **Email** | Clickable → customer profile |
| **Joined** | Account creation date |
| **Orders** | Count of orders in any non-CANCELLED status |
| **LTV** | Lifetime value in USD — sum of paid order totals minus refunds |
| **Last order** | Most recent order date, or `—` if none |

### Pagination
20 per page. Use Next / Prev. No jump-to-page (intentional — encourages
search instead of scroll).

## Common scenarios

**VIP outreach**
Sort visually by LTV (table is already LTV-ordered) → first page = top
customers. Manual export for now (no CSV button yet).

**Win-back targeting**
Look at **Last order** column — anyone over 90 days quiet is a candidate
for a "we miss you" email. Cross-reference with Klaviyo segment.

**Customer asks "how much have I spent?"**
Open their profile via email click → **Lifetime value** field.

## Edge cases & gotchas

- **LTV excludes CANCELLED and REFUNDED orders.** For partial refunds, the
  refunded amount is subtracted from the order's contribution.
- **Loyalty / wishlist counts aren't shown here** — they're on the profile.
- **Search hits the email field only.** Name search isn't supported.

## Related

- [Customer profile](profile.md) — single-customer deep view
- [Orders overview](../orders/overview.md) — for guest order lookups
