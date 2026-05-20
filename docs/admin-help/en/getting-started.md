# Getting started with the admin

## What this is for

The admin panel is where you run the shop day-to-day: list products, fulfil
orders, issue refunds, manage stock, and update store-wide settings. It is
restricted to users with the `ADMIN` role — customers cannot reach it.

## Daily routine

Most admins start their day by checking these screens in order:

1. **[Inventory](/admin/inventory)** — see the red badge in the sidebar. Any
   number means at least one product is at or below your low-stock threshold.
2. **[Orders](/admin/orders)** — pick up paid orders and move them through
   processing → shipped.
3. **[Production](/admin/orders/production)** — handmade pieces awaiting
   crafting, sorted by deadline (most urgent first).
4. **[Refunds](/admin/orders/refunds)** — recent refunds, in case a customer
   pings about a return.

## How navigation works

- **Sidebar** stays open on every admin page. Active section is highlighted.
- **Help (this drawer)** — press `?` anywhere in the admin, or click the
  floating `?` button in the top-right corner.
- All routes live under `/admin/*`. Going to `/` returns you to the public
  storefront.

## Quick conventions to know

- **Money is stored in USD cents** in the database. Admin forms show whole
  dollars where it makes sense and cents where precision matters (free
  shipping threshold, fixed-amount discounts).
- **Order IDs** are long; we show the last 8 uppercased characters for human
  reference. The full ID is in the URL of any order detail page.
- **Soft deletes** apply to discount codes — historical orders keep their
  reference and the code stays unreachable to new customers.

## Where to start

- New to the shop? Open **[Products → Create](/admin/products/new)** and walk
  through every field.
- Need to refund a customer? **[Orders → detail page → Issue refund](/admin/orders)**.
- Setting up a promo campaign? **[Discounts → Create code](/admin/discounts)**.
