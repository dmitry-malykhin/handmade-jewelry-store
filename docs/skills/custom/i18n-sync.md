# i18n-sync (custom)

**Priority:** 1 (top-5).
**Effort:** low.
**Impact:** high — каждое UI-изменение создаёт риск рассинхрона 3 локалей.

## Что делает

1. Сканирует все `useTranslations("ns")(key)` / `getTranslations("ns")` вызовы в `apps/web/src/`.
2. Загружает `messages/en.json`, `messages/ru.json`, `messages/es.json`, flatten к dot-paths.
3. Находит и реполит:
   - Ключи в коде, но НЕТ в каком-либо locale → блок
   - Ключи в EN, но отсутствуют в RU/ES → предлагает переводы
   - Orphan keys (в JSON, но не используются в коде) → warn only
4. Для отсутствующих RU/ES — генерирует переводы в тоне retail jewelry brand.

## Trigger

- Hook `PostToolUse` на `Edit/Write` где file matches `messages/*.json`
- Hook `Stop` (final pass)
- User invoke: `/i18n-sync`

## Установка

Создать `.claude/skills/i18n-sync/SKILL.md`:

````markdown
---
name: i18n-sync
description: Use when JSX/aria-label/placeholder/title strings are added or changed in apps/web/src/**/*.tsx, when apps/web/messages/{en,ru,es}.json is edited, or user types /i18n-sync. Diffs all three locale JSON files, reports missing keys (block on missing in EN; auto-translate to RU/ES if missing), and proposes translations grounded in EN tone (concise retail jewelry).
---

# i18n-sync

## When to invoke
- Edit/Write touched a file under `apps/web/src/**/*.tsx` introducing new `useTranslations("ns")(key)` / `getTranslations("ns")(key)` calls.
- Any edit to `apps/web/messages/{en,ru,es}.json`.
- User typed `/i18n-sync`.

## Procedure

1. **Collect used keys.** Glob `apps/web/src/**/*.{ts,tsx}`. Parse:
   - `useTranslations("<ns>")` then capture every `t("<key>")`, `t.rich("<key>")`, `t.markup("<key>")`.
   - `getTranslations({ locale, namespace: "<ns>" })` then capture `t(...)`.
   - String literals in `aria-label`, `placeholder`, `title`, `alt` JSX attributes — flag for extraction.
2. **Load locales.** Read all three JSON files, flatten to dot-paths.
3. **Report:**
   - **Missing in any locale** (block): list `ns.key — missing in: [ru, es]`
   - **Used in code, absent in EN** (block + must add): list `ns.key`
   - **Hardcoded strings found** (warn): list location + suggested key
   - **Orphan keys** (info only, never auto-delete): in JSON but unused
4. **Auto-translate RU/ES** when EN exists and RU/ES missing:
   - Tone: concise, retail-jewelry, e-commerce brand voice
   - For UI labels (Button, Link): single word/short phrase
   - For descriptions: complete sentence, no marketing fluff
   - For aria-label/placeholder: full descriptive phrase
5. **Apply changes** to JSON files. Maintain existing alphabetical ordering within namespace if present.

## Hard rules

- **camelCase** keys only (`shopNow`, not `shop_now` or `shop-now`).
- **Never touch** keys under `legal.*` namespace without explicit user confirmation (privacy policy, ToS).
- **Never delete** orphans — only report.
- **Never invent** new namespaces. Reuse closest existing: `header`, `footer`, `navigation`, `home`, `product`, `cart`, `checkout`, `account`, `errors`, `legal`, `seo`. Only create new namespace if clearly distinct domain and explicit user approval.
- Translate `aria-label`, `placeholder`, `title`, `alt` — all are user-visible.
- Preserve interpolation syntax: `{count}`, `{plural, count}`, ICU MessageFormat.

## Output format

```
i18n-sync report:

BLOCK (5):
  product.addToCart — missing in: ru, es
  cart.empty — missing in: en (used in CartEmpty.tsx:12)
  ...

WARN (2):
  Hardcoded "Quantity" in QuantitySelector.tsx:8 — suggest: product.quantity
  ...

PROPOSED translations (auto-applied):
  product.addToCart:
    en: "Add to cart"     (existing)
    ru: "Добавить в корзину"
    es: "Añadir al carrito"

Updated files: apps/web/messages/ru.json, apps/web/messages/es.json
```
````

## Параллельный hook

В `.claude/settings.json` (см. [hooks.md](../hooks.md)) — `scripts/check-i18n-parity.mjs` уже описан. Skill — для предложений переводов, hook — для blocking gate.

## Trade-offs

- Auto-translation качество зависит от модели. Для бренда — лучше выгружать в Lokalise/Crowdin после первой генерации. Skill даёт стартовый перевод, человек подтверждает
- Если файлы JSON отсортированы вручную — skill сохраняет sort. Но для большой структуры рекомендую alphabetical: `jq --sort-keys`

## Зависимости

- `apps/web/messages/{en,ru,es}.json` — должны существовать
- `next-intl` — в package.json
- Никаких external API

## Источник

- CLAUDE.md → раздел "i18n — mandatory on every component"
