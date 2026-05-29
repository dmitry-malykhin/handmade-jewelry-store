# Order detail

## What this is for

The per-order workbench. Everything you need to fulfil, track, refund or
investigate a single order lives on one page.

Layout — top to bottom:

1. **Summary** — IDs, totals, source, payment status
2. **Customer info** — email + guest/registered flag
3. **Line items** — what's being shipped
4. **Shipping address**
5. **Status update** — buttons to advance the state machine
6. **Tracking** — carrier + tracking number form
7. **Refund button** — opens the refund modal (only if payment SUCCEEDED or PARTIALLY_REFUNDED)
8. **Timeline** — every status change ever, with timestamp and author

## Fields & controls

### Status update — Change to … buttons
- **Purpose**: One click per allowed forward transition.
- **Consequences**: Immediate write. Adds an entry to the timeline. If you
  hit `DELIVERED`, loyalty points are credited and confirmation email fires.
- **Recommended order**: PAID → PROCESSING (when you start the work) →
  SHIPPED (after saving tracking) → DELIVERED (after customer confirms).

### Tracking — Carrier
- **Purpose**: Which courier the parcel goes with.
- **How to fill**: Select USPS / FedEx / UPS / DHL.
- **Consequences**: Shown to the customer in the order email + their account.

### Tracking — Tracking number
- **Purpose**: Carrier-issued shipment ID.
- **How to fill**: Paste exactly as printed on the label. No spaces.
- **Consequences**: Save → status moves to `SHIPPED` automatically (if it
  wasn't already) and the customer gets the "your order shipped" email.
- **Edge case**: Saving on an already-shipped order updates the number
  without re-firing the email — useful if you typo'd.

### Shipping label (EasyPost)
- **Purpose**: Buy a real carrier label without leaving the order page.
- **When it shows**: Only on `PAID` or `PROCESSING` orders that don't already
  have a label. Once purchased, the form is replaced by a "Download label"
  link.
- **Mode badge**: `Dry run` means there's no `EASYPOST_API_KEY` configured —
  the system fabricates a fake label URL + tracking number so the UI flow
  can be tested. `Live` means the next click costs real money. Always check
  the badge before purchasing.
- **Carrier**: Same four options as manual tracking. The carrier chosen
  here is written back to the order automatically.
- **Insurance toggle**: Only shown for orders ≥ $100. Toggling on insures
  the parcel for the order total. There is no partial-insurance UI; if you
  want a custom amount, use the carrier's portal directly.
- **Consequences**: One click writes shipment id, tracker id, tracking
  number, label URL and insurance to the order. Status does NOT advance to
  `SHIPPED` — drop the label in the mailbox first, then bump status by
  hand. When the carrier marks the package delivered, the EasyPost webhook
  transitions the order to `DELIVERED` automatically (which triggers
  loyalty credit + email).

### Refund button
- **Purpose**: Issue a full or partial refund via Stripe.
- **When it shows**: Only when `payment.status` is `SUCCEEDED` or
  `PARTIALLY_REFUNDED`. Hidden for refunded-in-full and unpaid orders.
- **How to fill**: See the modal — leave amount blank for full refund,
  always pick a reason, add a note for your records.
- **Consequences**: Calls Stripe `refunds.create`, updates the order status,
  emails the customer, records the entry visible in the [refunds ledger](refunds.md).

## Common scenarios

**Standard fulfilment**
PAID order arrives → ship → save tracking → status auto-bumps to SHIPPED →
when customer confirms or estimated delivery passes, set DELIVERED.

**Customer wants partial refund (e.g. damaged earring on a $200 order)**
Click **Issue refund** → amount `30.00` → reason `ITEM_DAMAGED` → note
"left earring arrived bent, refunded value of single piece". Submit. Order
moves to `PARTIALLY_REFUNDED`.

**Wrong tracking number saved**
Just save the corrected one. No need to revert state.

## Edge cases & gotchas

- **Source** field shows where the order originated (`web`, `pos`, etc.).
  Empty (`—`) for legacy orders before source tracking landed.
- **Timeline `by`** shows the admin email who made the transition. Stripe
  webhook transitions show `system`.
- **Refund button disappears after full refund** — once status is
  `REFUNDED`, payment is fully refunded and there's nothing left to refund.
  The order is still readable for the audit trail.
- **State machine is one-way**: once REFUNDED or DELIVERED you can't go
  "back". Loyalty credit at DELIVERED is reversible only by issuing a
  refund (which reverts the credit).

## Related

- [Orders overview](overview.md)
- [Refunds ledger](refunds.md)
- [Production queue](production.md) — for made-to-order pieces, work happens here too
