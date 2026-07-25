# Phase 2 — UX / Design walkthrough

**Goal**: walk every user-facing flow with a designer's eye. Catch broken
layouts, inconsistent spacing, wrong theme tokens, missing states (loading /
empty / error), missing responsive breakpoints, jumping focus, wrong
interactions.

**Prerequisite**: Phase 1 fully closed.

**Estimated effort**: half to full day. Cannot be fully automated — needs
Claude to inspect Playwright screenshots + a human to spot-check the tricky
moments (animation, focus flow, actual keyboard tab order).

**Definition of done**: every flow below either walked and ticked, or has a
finding-issue.

---

## 2.1 Guest checkout flow

- [ ] Product page → Add to cart → cart badge updates
- [ ] Cart page → line item quantities, remove, subtotal, VAT, shipping estimate
- [ ] Checkout entry → guest gateway visible, "Continue as Guest" primary
- [ ] Checkout step 1 (address) → validation errors are inline + localised
- [ ] Checkout step 2 (shipping method) → all options render, price updates
- [ ] Checkout step 3 (Stripe payment) → payment form loads, Apple/Google Pay
      buttons visible on supported devices, BNPL (Klarna, Afterpay) offered
- [ ] Test-card payment → confirmation page with order id, tracker fires
- [ ] Cart cleared after purchase

## 2.2 Auth flows

- [ ] Register: happy path, password strength meter, duplicate email error
- [ ] Login: happy path, wrong password error, remember-me if implemented
- [ ] Password reset: request email, click link, set new password, login with it
- [ ] Logout: token cleared, redirected, cart preserved or cleared per spec
- [ ] Session expiry: JWT refresh works silently, or user sees clean re-login
      prompt

## 2.3 Product discovery

- [ ] Home / catalog: hero, featured products, category tiles
- [ ] Category page: filters (price, category, material?), sort options, pagination
- [ ] Search: results relevance, no-results state, keyboard nav
- [ ] Product detail: gallery zoom, thumbnails, variant selector (size), price,
      stock indicator, "handmade to order" copy, reviews section, related products
- [ ] Wishlist: add / remove / see list, guest-user behavior

## 2.4 Cart & checkout UX

- [ ] Empty-cart state has a clear CTA back to catalog
- [ ] Quantity input keyboard-accessible + touchable (44px targets on mobile)
- [ ] Estimated delivery date shown per line
- [ ] Loyalty points redeem: input, cap, apply, remove
- [ ] Discount code input (if implemented)
- [ ] Skeleton loaders shown during async transitions, no layout jump on resolve

## 2.5 Account management

- [ ] Order history list + detail
- [ ] Addresses (add / edit / delete / set default)
- [ ] Profile (name, email, password change)
- [ ] Wishlist
- [ ] Loyalty points balance

## 2.6 Admin flows

For each admin module (Products, Categories, Orders, Users, Reviews):

- [ ] List page: sort, filter, search, pagination, bulk actions
- [ ] Detail / edit page: all fields save + validate + confirm on discard
- [ ] Delete confirms + no accidental cascade
- [ ] Image upload: drag-drop, progress, remove, order preservation
- [ ] Empty-state screen for zero-record cases

## 2.7 Theme coverage

- [ ] Every page rendered in **light** — no raw white / grey / black bleeding
      through (all colors are semantic tokens per CLAUDE.md).
- [ ] Every page rendered in **dark** — same check, plus ensure images / icons
      remain legible against dark background.
- [ ] Toggle theme mid-session — no flash of wrong theme, no re-hydration
      mismatch.

## 2.8 Responsive

- [ ] 320 px (small phone), 375 px (iPhone), 768 px (tablet portrait), 1024 px
      (tablet landscape), 1440 px (desktop) — no horizontal scroll on any page.
- [ ] Mobile nav (hamburger / bottom-nav) opens, closes, doesn't trap focus.
- [ ] Product gallery pinch-zoom on touch devices.
- [ ] Checkout on 375 px — every field visible without horizontal scroll,
      submit button reachable one-handed.

## 2.9 Interaction polish

- [ ] Focus rings visible on all interactive elements (buttons, links, inputs)
- [ ] Keyboard tab order matches visual order
- [ ] Skip-to-content link works
- [ ] Toasts announce to screen readers (`role="status"` or `role="alert"`)
- [ ] Modals return focus to the trigger element on close
- [ ] Loading spinners have `aria-live` / `aria-busy`

---

## Deliverables at end of Phase 2

1. Every flow ticked or has a finding-issue.
2. Parent closed after every finding-issue closed.
3. Screenshots directory + light/dark comparison attached as issue comments.
