# Customer profile

## What this is for

A single-page deep view of one registered customer. Profile metadata, every
order they've placed, and every shipping address they've used.

This page is read-only. There's no admin override for customer fields —
customers manage their own email, password and addresses via the storefront
account area. That's intentional: PII edits should be auditable and you
shouldn't have a one-click way to change them.

## Sections

### Profile card
- **Email** — the login email
- **Joined** — account creation date
- **Total orders** — count, all statuses
- **Lifetime value** — paid USD minus refunds (same calc as the list page)

### Order history
Every order this customer placed, newest first. Each row links to the order
detail page. Status badge mirrors the order's current status.

### Addresses
Every shipping address saved on the customer's account. The one marked
**Default** is what auto-fills at checkout.

## Common scenarios

**Customer support call**
"I want to check on order ABC123 placed last week" → search by their email
in [Customers overview](overview.md) → open profile → click the order in
the history → land on order detail with full context.

**Investigating shipping address quality**
Multiple typo'd entries in **Addresses** → flag the customer (note their
ID) and check whether failed deliveries correlate with this customer's
LTV before reaching out manually.

**Refund history check**
Order history shows status badges — `REFUNDED` and `PARTIALLY_REFUNDED`
stand out. Click into each to see the refund reason and timeline.

## Edge cases & gotchas

- **No edit buttons by design** — admins don't change customer PII through
  the admin. If a customer needs help, they reset via the storefront.
- **No "delete customer" button.** Account deletion is GDPR-sensitive and
  happens only through a documented support flow (escalate by email).
- **Address `isDefault` is per-customer.** A customer can have multiple
  saved addresses but only one default.
- **No guest profile exists** — guests don't have accounts. Their orders
  are accessible only via the orders page.

## Related

- [Customers overview](overview.md)
- [Order detail](../orders/detail.md)
