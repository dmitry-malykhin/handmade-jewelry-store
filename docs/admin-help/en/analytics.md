# Analytics

## What this is for

A single screen with the metrics that drive day-to-day product decisions:
which pieces are selling, where orders pile up, who's buying, and how
fast they ship. All numbers are scoped to the period you pick at the
top — defaults to the **last 30 days**.

Use this page when you ask yourself:

- "What should I make more of?"
- "Are refunds creeping up?"
- "How long is the gap between order and delivery this month?"

## Period selector

Switches every block on the page at once.

- **7 days** — daily ops view; surfaces sudden spikes.
- **30 days** — default; the rhythm most of these numbers are tuned for.
- **90 days** — quarterly overview, smooths short bursts.
- **1 year** — long-arc view, useful for season-over-season comparisons.

The period is local to this page — it doesn't carry over to the
dashboard's revenue chart, and refreshes don't lose the choice unless
you reload the tab.

## Key metrics (4 cards)

### New customers
Customers whose **first ever paid order** falls inside the period.

- Counts only registered customers (guest orders don't have a
  customer ID to follow).
- Re-counting a returning customer as "new" can only happen if you
  hard-delete their old account and they re-register.

### Returning customers
Registered customers who placed a paid order inside the period **and**
have at least one earlier paid order outside it.

- New + Returning ≠ total orders — guests are excluded from both, and
  a single customer with three orders in the window still counts as
  one.

### Refund rate
`refunded orders ÷ paid orders × 100`, rounded to the nearest percent.

- "Paid" here means any order that brought in cash:
  `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `PARTIALLY_REFUNDED`.
- Above **5%** for a month is worth digging into — pick the period's
  refunds (Orders → Refunds) and look for a pattern.

### Average days to delivery
Mean of `deliveredAt − createdAt` across orders **delivered** inside
the period.

- Rounded to whole days.
- Only includes orders with both timestamps — pending/processing/
  shipped orders don't influence the number.
- Spikes here are usually production capacity, not shipping.

## Top products (table)

Ranked by **revenue** in the period (descending), capped at 10 rows.

- Revenue = `sum(price × quantity)` across all order items, even when
  the product was discounted at checkout — the line-item price is what
  counts.
- Units sold = sum of quantities, so a single order of three rings adds
  3 units.
- Image, title, average rating and review count are read live from the
  current product record — if you renamed or hid a product, the new
  values show here.
- Deleted products don't appear, even if they have order history in
  the period.

The product title links to the public product page so you can audit
the listing without leaving the admin.

## Order status breakdown (donut)

Counts orders by their **current** status across the period — not the
status they had when created.

- All 8 statuses always appear in the legend, even when their count is
  zero, so the layout is stable when you flip between periods.
- The donut chart hides zero-count slices (a chart with phantom
  segments is harder to read at a glance).
- Numbers reflect orders **created** in the period — a January order
  that delivered in March still belongs to January's breakdown.

## Common scenarios

### "Sales dropped this week — what changed?"
1. Switch to **7 days**.
2. Compare top products vs. last week (manually — there's no overlay
   yet).
3. Check refund rate — a refund spike can suppress net revenue.

### "Production is overloaded"
1. Look at **Average days to delivery** for 30d vs 90d.
2. If 30d is materially worse, see status breakdown — count of
   `PROCESSING` orders is the queue depth.

### "Which categories sell best?"
Not in this view yet — top products is product-level. Use Products
filter by category as an interim.

## Caveats

- Numbers are computed live on every visit. The page does **not** cache
  — open-and-refresh repeatedly is fine.
- All amounts are in **USD cents** internally and rendered as USD;
  multi-currency display is on the dashboard chart, not here yet.
- Time math uses the server's local time zone. For pre-launch ops in a
  single time zone, this is fine — note it if you switch to a different
  region.
