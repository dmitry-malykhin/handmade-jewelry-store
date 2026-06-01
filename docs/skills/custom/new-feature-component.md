# new-feature-component (custom)

**Priority:** 2 (top-5).
**Effort:** low.
**Impact:** high — главный multiplier на daily work. Один вызов = все 12 правил CLAUDE.md соблюдены.

## Что делает

Скаффолд нового feature-компонента под `apps/web/src/components/features/<domain>/<Name>/`:

- Server Component по умолчанию
- Опциональный `<Name>.client.tsx` если нужна интерактивность
- `index.ts` барель
- Props через `interface`, no `any`
- Семантические HTML теги (`article`, `section`, `nav`, `aside`)
- `next/image` с явными width/height
- Все строки через `useTranslations()` / `getTranslations()`
- Только семантические theme tokens (`bg-card`, `text-foreground`)
- Ключи переводов пред-добавлены в `messages/{en,ru,es}.json`

## Trigger

- User: `/new-feature-component CartItemRow cart` или фраза "новый компонент CartItemRow в домене cart"
- Auto-suggest: когда юзер просит "создай компонент X" в области features

## Установка

Создать `.claude/skills/new-feature-component/SKILL.md`:

````markdown
---
name: new-feature-component
description: Use when the user asks to create a new feature component (e.g. "новый компонент CartItemRow", "create ProductBadge"). Scaffolds a Server Component under apps/web/src/components/features/<domain>/<Name>/ with optional .client.tsx, types via interface, semantic HTML, next/image, theme tokens, and translation keys pre-seeded into all three locale files.
---

# new-feature-component

## Inputs to clarify before scaffolding

1. **Component name** — PascalCase, noun-based (`ProductCard`, `CartItemRow`, `CheckoutSummary`).
2. **Domain** — one of: `product`, `cart`, `checkout`, `account`, `category`, `wishlist`, `review`, `search`, `seo`. If user-specified domain doesn't fit — ask, don't invent.
3. **Needs client interactivity?** Default: no.
   - Yes if: stateful UI, event handlers, browser APIs, animations
   - No if: pure rendering, data display, layout
4. **Composition role** — atom / molecule / organism (informational; affects size expectations).

## Files created

```
apps/web/src/components/features/<domain>/<Name>/
├── <Name>.tsx                 # Server Component
├── <Name>.client.tsx          # IFF interactive (explicit 'use client' here, not in <Name>.tsx)
├── <Name>.spec.tsx            # RTL component test
└── index.ts                   # export * from './<Name>'
```

## Template rules

- `interface <Name>Props { ... }`. **No `any`**.
- Semantic tag: choose based on role
  - `<article>` for self-contained item (product card, review)
  - `<section>` for thematic grouping
  - `<nav>` for navigation
  - `<aside>` for sidebar/filters/tools
  - `<ul role="list"> + <li>` for collections
  - `<figure> + <figcaption>` for image groups
  - **Never `<div>`** for content.
- `next/image` with explicit `width` and `height`. `priority` only if LCP candidate (first image above fold).
- All visible text via `useTranslations()` (Server) / `getTranslations()` (Server async) / `useTranslations()` (Client).
- Theme tokens only: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`. **No raw colors** (`text-gray-900`, `bg-white`).
- One component per file. Split into `<Name>.client.tsx` if mixed Server/Client.
- **No `useEffect` for fetching** — use TanStack Query hook (invoke `/tanstack-query-hook` skill if needed).
- Named onClick handlers (`handleAddToCart`), never inline arrow on long logic.
- Loop variables: `cartItem`, `product`, `order` — never `i`, `x`, `item`.

## Translation seeding

For every visible string in the scaffolded component, add to `messages/en.json` first (placeholder for user to write), then auto-translate to `ru.json` and `es.json` via the `/i18n-sync` skill.

Choose namespace from closest existing: `<domain>` or `<domain>.<sub>`.

## Post-scaffold steps

1. Invoke `/cowrite-tests` skill to generate matching RTL spec.
2. If component displays price → invoke `/price-display` skill.
3. If component is a page-level addition → invoke `/seo-page-audit` after.
4. Report all created files + namespaces added in i18n.

## Example invocation

User: "Создай компонент ProductBadge в домене product, интерактивный (кликабельный для filter)"

Скаффолд:
```
apps/web/src/components/features/product/ProductBadge/
├── ProductBadge.tsx           (Server)
├── ProductBadge.client.tsx    (Client — interactive)
├── ProductBadge.spec.tsx
└── index.ts
```

i18n keys added:
- `product.badge.new` — "New" / "Новинка" / "Nuevo"
- `product.badge.sale` — "Sale" / "Скидка" / "Oferta"
- ...
````

## Trade-offs

- Не покрывает page components (страницы `app/[locale]/.../page.tsx`) — для них separate skill `new-page` (см. [SKILLS_PLAN.md](../../18_CLAUDE_SKILLS_PLAN.md), категория Frontend)
- Generates a lot of boilerplate (4 файла). Для очень мелких компонентов overkill, но дисциплина важнее

## Зависимости

- `apps/web/messages/{en,ru,es}.json`
- TanStack Query setup
- Tailwind theme tokens в `globals.css`

## Источник

- CLAUDE.md — все правила React/i18n/theming/semantic HTML
- docs/03_CODE_RULES.docx
- Memory: `feedback_frontend_senior_patterns.md`, `feedback_named_handlers.md`
