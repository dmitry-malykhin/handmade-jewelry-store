# i18n — translation policy

How translations are organized in `apps/web/messages/{en,ru,es}.json` and which strings stay English on purpose.

---

## Structure

- One JSON file per locale: `en.json`, `ru.json`, `es.json`.
- **All three files must have identical key shape** (key parity). Adding a key to one means adding it to all three.
- Keys are camelCase, grouped by namespace at the top level (`header`, `footer`, `cartPage`, `admin`, …).
- Server Components: `await getTranslations({ locale, namespace: 'xyz' })`.
- Client Components: `useTranslations('xyz')`.

## What MUST be translated

Anything a customer or admin reads while using the site in their chosen locale:

- Page headings, paragraphs, button labels, form placeholders
- Error messages, toast notifications, confirmation prompts
- ARIA labels, `title` attributes, image `alt` text
- Email subject lines and bodies
- Validation messages from forms

If a string is rendered inside JSX without `t('...')` and a customer can see it, it's a bug.

## What stays English on purpose

These exemptions exist because translation would harm clarity, not help it.

### Universal technical identifiers

These are lingua franca across all locales — translating them creates confusion, not localization.

- `SKU`, `Slug`, `URL`, `ID`, `JSON`, `CSV`, `PDF`
- Carrier names: `USPS`, `FedEx`, `UPS`, `DHL`
- Brand and product names (always English: "Senichka", "Sterling Silver")
- HTTP status codes, currency codes (USD, EUR, RUB), country codes (US, RU, ES)

### E-commerce technical terms widely used as-is

In Spanish (and Russian admin/finance contexts) some English words have become standard usage. They appear in receipts, accounting software, and bank statements unchanged. Translating them looks foreign, not native.

- `Subtotal`, `Total` (used identically in Spanish — same spelling, same meaning)
- `Email` (standard in both RU and ES tech contexts; "correo electrónico" only in formal copy)
- `Stock` (Spanish admin tables; "Existencias" is also valid and preferred in customer-facing UI — applied in #283)

The judgment call: **customer-facing copy** in cart/checkout/product detail leans toward localized terms; **admin column headers** lean toward the English-as-jargon convention.

### Catastrophic-error fallbacks

[`apps/web/src/app/global-error.tsx`](../app/global-error.tsx) is intentionally English-only. It renders **before** the `[locale]` layout has set the request-locale context, so neither next-intl messages nor a locale param are available. Showing a generic English fallback ("Something went wrong / Try again") is the industry norm — preferable to crashing the fallback itself trying to load translations.

## Key naming conventions

| Pattern                                      | Use for                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `<namespace>.<field>`                        | leaf string in a flat group                                                  |
| `<namespace>.<entity>_<id>_<part>`           | parallel groups like FAQ Q&A (`faqPage.q_shippingTime_question` / `_answer`) |
| `<namespace>.<entity>List` / `<entity>Empty` | list-rendering states                                                        |

camelCase only. No kebab-case, no snake_case (except in machine-readable values like product slugs).

## Catching regressions

- `apps/web/src/components/shared/__tests__/internal-links.test.ts` flags hardcoded `/dead/routes`.
- `apps/web/src/i18n/__tests__/parity.spec.ts` ensures key shape matches across all three locale files.
- ESLint rule `react/jsx-no-literals` is **not** enabled (too noisy on legitimate non-text content), so reviewers should spot hardcoded strings in PRs.

## Adding a new translation key — checklist

1. Add the key to the closest existing namespace in `en.json`.
2. Mirror it into `ru.json` and `es.json` with proper translations.
3. Use it via `useTranslations()` or `getTranslations()` — never `t.raw()` for user-visible copy.
4. Run `pnpm --filter web test:run -- src/i18n` to confirm parity.

## When to update this file

- Adding a new exemption category (e.g. medical disclaimers must stay English for legal reasons).
- Changing the convention for an entire namespace (e.g. moving admin from English-as-jargon to fully translated).
- New tooling for catching missing translations (lint rules, CI checks).
