# Phase 3 — Product / PM + Sales / Marketing audit

**Goal**: view the site as a buyer + a growth manager. Where does the funnel
leak? What conversion levers are missing? Is SEO / analytics / email actually
capturing the value?

**Prerequisite**: Phase 2 fully closed.

**Estimated effort**: half a day.

**Definition of done**: every checkbox below is either ticked or has a linked
finding-issue.

---

## 3.1 Conversion funnel

Walk the buyer path and question every friction point:

- [ ] Landing → product click within 3 taps. Above-fold products on mobile.
- [ ] Product page → obvious "Add to cart" CTA, above fold on mobile.
- [ ] Add to cart → visible confirmation (toast + cart badge update), no full
      page reload.
- [ ] Mini-cart drawer or clear "View cart" affordance.
- [ ] Guest checkout is the primary path, not "Login first" wall.
- [ ] Checkout: 3 clear steps, progress indicator, can go back without losing
      data.
- [ ] Payment: Apple/Google Pay above card entry on mobile.
- [ ] Confirmation: "what happens next" (email confirmation, production time,
      shipping) is spelled out.
- [ ] Order tracking: user knows where to check status (link in email + account
      page).

## 3.2 SEO on every public page

For every page in `apps/web/src/app/[locale]/**` (skip admin + api):

- [ ] `generateMetadata` returns `title` (≤ 60 chars) + `description` (140-160
      chars). No page falls through to the root layout default.
- [ ] `canonical` URL set (absolute, with the correct
      `NEXT_PUBLIC_SITE_URL`).
- [ ] `openGraph.title` + `openGraph.description` + at least one
      `openGraph.image` (1200×630).
- [ ] `twitter.card = 'summary_large_image'` + same fields.
- [ ] `alternates.languages` = `en` + `ru` + `es` (hreflang).
- [ ] JSON-LD structured data where relevant: `Product` on product pages
      (with `offers`, `aggregateRating`, `review`), `BreadcrumbList` on any
      page ≥ 2 deep, `Organization` in root layout.
- [ ] `robots.txt` + `sitemap.xml` present and correct: sitemap lists every
      public page × locale, excludes `/checkout`, `/account/*`, `/admin/*`.
- [ ] All product images have descriptive `alt` (not "image", not empty on
      content images).
- [ ] Semantic HTML: exactly one `<h1>` per page, `<main>` present, `<nav>` +
      `<article>` + `<section>` used per CLAUDE.md.

## 3.3 Analytics coverage

Verified in #370, re-check under real network:

- [ ] With cookie consent granted, DevTools Network shows POST to `google-
      analytics.com/g/collect`, `facebook.com/tr/`, `klaviyo.com/api/track`,
      `pintrk` for every one of the 4 events: view_item, add_to_cart,
      begin_checkout, purchase.
- [ ] With cookie consent rejected — zero requests to any of those hosts.
- [ ] PostHog session replay: verify Session Recording captures at least one
      full session in the last day (login to app.posthog.com).
- [ ] GA4 Realtime — see own visit within 30 seconds.
- [ ] Facebook Events Manager Test Events shows the pixel firing.
- [ ] Klaviyo Metrics — "Viewed Product", "Added to Cart", "Started Checkout",
      "Placed Order" have data in the last 24h.

## 3.4 Email flows

For each transactional / marketing flow, verify the trigger, template, and
delivery. Missing flow → finding-issue.

- [ ] Welcome / account created (Resend)
- [ ] Order confirmation (Resend, immediate)
- [ ] Shipping notification (Resend, triggered by admin marking order SHIPPED)
- [ ] Delivered / review-request (Resend, delay after DELIVERED status)
- [ ] Password reset (Resend, immediate)
- [ ] Abandoned cart (Klaviyo flow, 1h / 24h / 3d)
- [ ] Abandoned checkout (Klaviyo flow, 30m / 6h)
- [ ] Browse abandonment (Klaviyo flow)
- [ ] Win-back (Klaviyo, 60/90d since last order)
- [ ] Post-purchase upsell / cross-sell (Klaviyo)

## 3.5 Trust signals

- [ ] Reviews / star rating visible on product cards + product detail
- [ ] "Handmade to order" copy explicit (why 5-10 day production time)
- [ ] Return / refund policy prominent (footer + on cart / checkout)
- [ ] Secure checkout badges (Stripe, SSL)
- [ ] Contact information (email + physical address per CLAUDE.md compliance
      rules)
- [ ] Social proof: press mentions, customer photos, Instagram embed
- [ ] Money-back guarantee, if any, is on the product page not buried in Terms
- [ ] "As seen on" / testimonials

## 3.6 Pricing & payment options

- [ ] Currency shown matches user's locale + a visible switcher (per
      [docs/09_MULTI_CURRENCY.md](../09_MULTI_CURRENCY.md))
- [ ] EU VAT shown inclusive; US shipping states show tax at checkout
- [ ] BNPL (Klarna, Afterpay) offered on eligible price points — installment
      preview visible on product page
- [ ] Free shipping threshold prominently displayed if applied

## 3.7 Content quality

- [ ] Every product has: ≥ 3 photos, dimensions, weight, material,
      care-instructions, story ("what inspired this piece")
- [ ] Categories have descriptions (SEO body text), not empty pages
- [ ] Blog / journal / lookbook (if any) — evergreen posts targeting long-tail
      keywords
- [ ] "About us" tells a story with a face + workshop photo

---

## Deliverables at end of Phase 3

1. Every box ticked or has a finding-issue.
2. Parent closed after every finding-issue closed.
3. Funnel snapshot (analytics numbers), SEO coverage report, email flow map
   attached to parent as comments.
