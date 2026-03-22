# Verification Flow — Handmade Jewelry Store

> Запускай этот флоу **перед каждым коммитом**.
> Выполняй все команды из **корня проекта** (`handmade-jewelry-store/`).

---

## Почему два флоу

Фронтенд и бэкенд имеют разные инструменты, разные типы ошибок и разные критерии готовности:

| Критерий | Backend (NestJS) | Frontend (Next.js) |
|---|---|---|
| Фреймворк сборки | `nest build` → `dist/` | `next build` → `.next/` |
| Тесты | Jest + Supertest | Vitest + Playwright |
| E2E среда | HTTP сервер в памяти | Реальный браузер |
| Специфика | Prisma, DI, декораторы | SSR, metadata, гидрация |
| Типы ошибок | Decorator runtime, DI tokens | Hydration mismatch, SSR fails |

---

## Backend Flow (NestJS) — Issue #4, #16, #17, #19, #20, #27, #29, #32 и т.д.

Запускай при любом изменении в `apps/api/`.

### Шаг 1 — TypeScript

```bash
cd apps/api && npx tsc --noEmit && cd ../..
```

Зачем: ловит ошибки типов до запуска. NestJS активно использует декораторы и generics —
tsc находит то, что Jest пропускает (неверные DTO типы, сломанный DI через `import type`).

### Шаг 2 — Prisma (только при изменении schema.prisma)

```bash
pnpm db:generate
```

Зачем: если добавил/изменил модель в `schema.prisma` — нужно пересгенерировать клиент.
Иначе TypeScript не увидит новые поля, `prismaService.user.findMany()` не скомпилируется.

### Шаг 3 — Unit тесты

```bash
pnpm api:test
```

Зачем: быстрые тесты без HTTP сервера. Проверяют бизнес-логику сервисов, трансформации DTO,
утилиты. Работают с моками — не нужна реальная БД.

### Шаг 4 — E2E тесты

```bash
pnpm api:test:e2e
```

Зачем: поднимает реальный NestJS сервер в памяти (через `supertest`), делает HTTP запросы.
Проверяет роутинг, guards, filters, реальные ответы API. БД не нужна — используются моки.

### Шаг 5 — Build

```bash
pnpm api:build
```

Зачем: NestJS билд компилирует TypeScript с `tsc` + обрабатывает декораторы через `ts-node`.
Иногда код проходит `tsc --noEmit` но ломается в билде из-за `tsconfig.build.json` исключений.
Обязательно перед деплоем.

### Шаг 6 — Lint + Format

```bash
pnpm lint && pnpm format:check
```

---

## Frontend Flow (Next.js) — Issue #12, #13, #14, #22, #23, #25, #33 и т.д.

Запускай при любом изменении в `apps/web/`.

### Шаг 1 — TypeScript

```bash
cd apps/web && npx tsc --noEmit && cd ../..
```

Зачем: ловит ошибки типов в компонентах, хуках, серверных функциях.

### Шаг 2 — Unit / Component тесты

```bash
pnpm web:test
```

Зачем: Vitest + React Testing Library. Тестирует компоненты в изоляции, кастомные хуки,
утилиты (форматирование цены, slug генерация и т.д.).

### Шаг 3 — Build

```bash
pnpm --filter web build
```

Зачем: Next.js build находит ошибки которые не видны в dev режиме:
- отсутствующий `generateMetadata` на странице
- `'use client'` на Server Component который экспортирует `metadata`
- неправильный импорт в Server Component (browser-only API)
- ошибки ISR (`export const revalidate`)

### Шаг 4 — E2E тесты (только при изменении UI)

```bash
pnpm web:test:e2e
```

Зачем: Playwright запускает реальный браузер. Тестирует пользовательские флоу: добавить в корзину,
перейти в checkout, заполнить форму. Медленно — запускай только если трогал UI.

### Шаг 5 — Lint + Format

```bash
pnpm lint && pnpm format:check
```

---

## Полный флоу (оба приложения) — перед merge в main

```bash
# 1. TypeScript
cd apps/api && npx tsc --noEmit && cd ../..
cd apps/web && npx tsc --noEmit && cd ../..

# 2. Все тесты
pnpm api:test
pnpm api:test:e2e
pnpm web:test

# 3. Билды
pnpm api:build
pnpm --filter web build

# 4. Lint + Format
pnpm lint && pnpm format:check
```

---

## Быстрая шпаргалка — что запускать при изменении конкретных файлов

| Изменил | Минимальный набор команд |
|---|---|
| `apps/api/src/**/*.ts` | `tsc --noEmit` → `api:test` → `api:test:e2e` → `api:build` → `lint` |
| `apps/api/prisma/schema.prisma` | `db:generate` → `api:test` → `api:test:e2e` → `api:build` → `lint` |
| `apps/web/src/components/**` | `tsc --noEmit` → `web:test` → `web build` → `lint` → `web:test:e2e` |
| `apps/web/src/app/**/page.tsx` | `tsc --noEmit` → `web build` → `lint` (metadata обязательна!) |
| `packages/shared/**` | Оба: `api:test` + `web:test` + оба `tsc --noEmit` |
| `*.config.*` / `package.json` | `lint` + `format:check` + `api:build` + `web build` |

---

## Частые ошибки и как их поймать

### Backend

| Ошибка | Что ловит |
|---|---|
| `import type` сломал NestJS DI | `api:build` падает с "Cannot read properties of undefined" |
| Prisma типы устарели после изменения схемы | `tsc --noEmit` в api |
| Декоратор применён к неправильному типу | `tsc --noEmit` в api |
| Guard не подключён → роут не защищён | `api:test:e2e` |
| DTO валидация не работает | `api:test:e2e` (проверяй 400 ответы) |

### Frontend

| Ошибка | Что ловит |
|---|---|
| `metadata` экспортирован из `'use client'` компонента | `next build` |
| Hydration mismatch (SSR ≠ Client) | `next build` + `web:test:e2e` |
| Отсутствует `generateMetadata` на динамической странице | `next build` (warning) |
| `window` или `document` в Server Component | `next build` |
| Сломан `useQuery` хук | `web:test` |
