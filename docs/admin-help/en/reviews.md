# Reviews

## What this is for

Moderation surface for every customer review. Three things you do here:

1. **Approve** new reviews so they appear on the product page.
2. **Hide** spam, abusive, or off-topic reviews.
3. **Reply publicly** as the seller — shown indented below the customer's
   review on the product page.

Only **Approved** reviews are visible to shoppers. Product averages
(`avgRating`, `reviewCount`) are recomputed from Approved reviews only —
hiding a 5-star review immediately drops the average.

## Fields & controls

### Status filter
- Values: `All statuses`, `Pending`, `Approved`, `Hidden`.
- New reviews start as **Pending** — they don't influence the product
  page until you act on them.

### Rating filter
- 1 to 5 stars. Useful to surface low ratings first when triaging.

### Approve / Hide buttons
- Per row. The current status's button is hidden — you only see
  transitions that make sense.
- Effect: instant. Product averages recompute in the same transaction.

### Reply
- Inline textarea, up to 2000 characters.
- A preview pane shows exactly how the reply will render on the product
  page.
- Saving stamps `sellerRepliedAt`. Subsequent edits update the same
  field — there's no version history.
- A reply does **not** depend on the review's status. You can prepare a
  reply on a Pending review before approving it.

## Common scenarios

**New review came in**
Filter `Pending` → read the comment → Approve if legitimate, Hide if spam.

**Negative review on a custom order**
Approve so other customers see you don't hide criticism → Reply with
context (e.g. "We refunded this order — extra apologies to Sarah").
Public reply demonstrates transparency.

**Spam detection**
Filter `Pending` + sort visually for obvious red flags (5-star with no
comment from new account, identical text across products). Hide.

## Edge cases & gotchas

- **Hiding a previously-approved review** removes it from the product
  page and drops it from `avgRating` immediately.
- **Re-approving a hidden review** re-counts it in the average.
- **No version history** for replies — last save wins. Be deliberate
  before editing a published reply.
- **Reviewer email is shown here but masked publicly** to "Jane d." on
  the product page.

## Related

- [Customers profile](customers/profile.md) — see all reviews from one customer
