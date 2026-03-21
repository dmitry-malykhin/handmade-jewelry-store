# SEO Rules — Handmade Jewelry Store

> Эти правила применяются на всех этапах разработки, начиная с W2.
> SEO — не отдельная задача (Issue #36), а обязательный слой каждого компонента.
> Цель: органический трафик Google + Google Shopping + Pinterest/Instagram visual search.

---

## Почему SEO критичен именно сейчас

Переделка SEO-архитектуры после запуска стоит в 10 раз дороже.
Три решения принятые сейчас определяют SEO на годы:

1. **Slug вместо ID в URL** — `/products/silver-ring-moonstone` vs `/products/42`
2. **Server Components для контента** — Google индексирует HTML, не JS
3. **Structured data с первого дня** — Google Shopping требует JSON-LD на странице продукта

---

## Влияние на задачи по неделям

### W3 — Database Schema (#17) — КРИТИЧНО

```prisma
model Product {
  id          String   @id @default(cuid())
  slug        String   @unique  // ← ОБЯЗАТЕЛЬНО. Без slug SEO невозможен
  title       String
  description String   @db.Text
  price       Decimal  @db.Decimal(10, 2)
  stock       Int      @default(0)
  images      String[]
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([slug])         // индекс для быстрого поиска по slug
  @@index([categoryId])   // индекс для фильтрации по категории
}

model Category {
  id       String    @id @default(cuid())
  name     String
  slug     String    @unique  // ← ОБЯЗАТЕЛЬНО. /categories/rings, не /categories/3
  products Product[]

  @@index([slug])
}
```

### W4 — Products API (#20)

API должен возвращать `slug` во всех эндпоинтах.
URL продукта строится через slug, не через id:

```
✅ GET /products/silver-ring-moonstone
❌ GET /products/42
```

### W4 — Catalog page (#22) и Product detail (#23) — КРИТИЧНО

Страницы каталога и продукта — главные точки входа из Google.
Правила описаны ниже в секции компонентов.

---

## Правила компонентов — SEO слой

### 1. Metadata — обязательна на каждой странице

```tsx
// ✅ Статическая metadata (layout, статичные страницы)
export const metadata: Metadata = {
  title: 'Handmade Silver Jewelry | Rings, Earrings, Necklaces',
  description: 'Unique handmade silver jewelry. Each piece crafted by hand in small batches. Free shipping on orders over $50.',
  keywords: ['handmade jewelry', 'silver rings', 'artisan earrings'],
  openGraph: {
    title: 'Handmade Silver Jewelry Store',
    description: '...',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
}

// ✅ Динамическая metadata (страница продукта)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug)

  return {
    title: `${product.title} | Handmade Jewelry Store`,
    description: product.description.slice(0, 160), // max 160 символов
    openGraph: {
      title: product.title,
      description: product.description.slice(0, 160),
      images: [{ url: product.images[0], width: 800, height: 800, alt: product.title }],
      type: 'article',
    },
    alternates: {
      canonical: `https://yourdomain.com/products/${product.slug}`,
    },
  }
}
```

**Правила:**
- `title`: 50–60 символов, ключевое слово в начале
- `description`: 120–160 символов, уникальная для каждой страницы
- `canonical` обязателен на динамических страницах — защита от дублей
- OpenGraph обязателен — нужен для Pinterest, Instagram, ВКонтакте

---

### 2. Структурированные данные JSON-LD — страница продукта

Google Shopping и rich snippets в выдаче требуют JSON-LD.
Без этого товары не попадают в Google Shopping бесплатно.

```tsx
// src/components/features/catalog/ProductJsonLd.tsx
// Server Component — рендерится на сервере, Google читает из HTML

interface Props {
  product: {
    title: string
    description: string
    price: number
    currency: string
    images: string[]
    slug: string
    stock: number
  }
}

export function ProductJsonLd({ product }: Props) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `https://yourdomain.com/products/${product.slug}`,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
```

```tsx
// src/app/(shop)/products/[slug]/page.tsx
export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.slug)

  return (
    <>
      <ProductJsonLd product={product} />  {/* ← в <head> через layout */}
      <ProductDetails product={product} />
    </>
  )
}
```

**Также добавить на нужных страницах:**

```tsx
// Хлебные крошки (Breadcrumb) — на странице продукта и каталога
const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://yourdomain.com' },
    { '@type': 'ListItem', position: 2, name: 'Rings', item: 'https://yourdomain.com/categories/rings' },
    { '@type': 'ListItem', position: 3, name: product.title },
  ],
}

// Организация — в root layout один раз
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Handmade Jewelry Store',
  url: 'https://yourdomain.com',
  logo: 'https://yourdomain.com/logo.png',
  sameAs: [
    'https://instagram.com/your-handle',
    'https://pinterest.com/your-handle',
  ],
}
```

---

### 3. Семантическая HTML-структура

```tsx
// ✅ Правильно — семантика
export default function CatalogPage() {
  return (
    <main>
      <h1>Handmade Silver Rings</h1>           {/* один h1 на страницу */}
      <p>Unique rings crafted by hand...</p>    {/* описание категории для SEO */}
      <section aria-label="Product filters">
        <Filters />
      </section>
      <section aria-label="Products">
        <ul role="list">
          {products.map(p => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

// ❌ Неправильно — div-суп
export default function CatalogPage() {
  return (
    <div>
      <div className="title">Rings</div>
      <div className="products">
        {products.map(p => <div key={p.id}><ProductCard /></div>)}
      </div>
    </div>
  )
}
```

**Иерархия заголовков:**
```
layout.tsx:          нет h1 (только site name в <title>)
/                    h1: "Handmade Jewelry — Unique Artisan Pieces"
/products            h1: "All Jewelry" или "Handmade Silver Rings" (если категория)
/products/[slug]     h1: название продукта (product.title)
```

---

### 4. Изображения — next/image обязателен

```tsx
import Image from 'next/image'

// ✅ Обязательный минимум для SEO
<Image
  src={product.images[0]}
  alt={`${product.title} — handmade silver ring`}  // ← описательный alt с ключевым словом
  width={800}
  height={800}
  priority={isAboveTheFold}  // ← true для первого изображения на странице (LCP!)
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>

// ❌ Запрещено
<img src={product.images[0]} />           // нет оптимизации
<Image src={...} alt="" />                // пустой alt — штраф в Google
<Image src={...} alt="image" />           // generic alt — бесполезен
```

**Правила alt-текста для ювелирного магазина:**
```
✅ "Sterling silver moonstone ring — handmade artisan jewelry"
✅ "Rose gold leaf earrings — unique handcrafted earrings"
❌ "ring"
❌ "product image"
❌ "" (пустой)
```

---

### 5. URL-структура — slug обязателен

```
✅ Правильная структура URL:
/                                  → главная
/products                          → весь каталог
/products?category=rings           → фильтр (не /categories/rings — избегаем дублей)
/products/silver-moonstone-ring    → страница продукта через SLUG
/about                             → о магазине

❌ Запрещённая структура:
/products/42                       → ID в URL — не читается человеком и Google
/product/42                        → единственное число (inconsistent)
/shop/items/ring?id=42             → сложный путь
```

**Slug генерируется на бэкенде при создании продукта:**
```ts
// apps/api/src/modules/products/products.service.ts
import { transliterate } from 'transliteration' // или slugify

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // оставить только латиницу и цифры
    .replace(/\s+/g, '-')           // пробелы → дефисы
    .replace(/-+/g, '-')            // убрать двойные дефисы
    .trim()
}
// "Silver Moonstone Ring" → "silver-moonstone-ring"
```

---

### 6. Server Components — контент рендерится на сервере

```tsx
// ✅ Catalog page — Server Component (данные приходят в HTML)
// Google читает готовый HTML, не ждёт выполнения JS
async function CatalogPage() {
  const products = await getProducts()  // данные на сервере
  return <ProductGrid products={products} />
}

// ✅ Client Component — только для интерактивности
'use client'
function AddToCartButton({ productId }: { productId: string }) {
  // только кнопка, не вся страница
}
```

**Правило:** страницы каталога (`/products`) и продукта (`/products/[slug]`) должны быть Server Components. Google не индексирует данные которые загружаются через `useEffect` в браузере.

---

### 7. Производительность — Core Web Vitals

Google использует Core Web Vitals как фактор ранжирования.

| Метрика | Что | Целевое значение |
|---|---|---|
| LCP | Largest Contentful Paint | < 2.5s |
| CLS | Cumulative Layout Shift | < 0.1 |
| INP | Interaction to Next Paint | < 200ms |

**Правила для LCP (главное изображение загружается быстро):**
```tsx
// Первое изображение продукта — всегда priority
<Image src={product.images[0]} priority alt={...} />
```

**Правила против CLS (контент не прыгает):**
```tsx
// ✅ Явные размеры — контент не прыгает при загрузке
<Image width={800} height={800} src={...} alt={...} />

// ❌ fill без контейнера фиксированного размера — CLS
<Image fill src={...} alt={...} />
```

**Минимизация JS:**
- Zustand store — только для cart и user (не тащи туда данные которые может дать Server Component)
- TanStack Query — только для данных которые нужно обновлять в реальном времени (цена, stock)
- Остальное — Server Components, ноль JS в бандле

---

### 8. Sitemap и robots.txt — Issue #36, но спроектировать сейчас

```ts
// src/app/sitemap.ts — автогенерация Next.js
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getAllProducts() // slug, updatedAt

  return [
    { url: 'https://yourdomain.com', changeFrequency: 'weekly', priority: 1 },
    { url: 'https://yourdomain.com/products', changeFrequency: 'daily', priority: 0.9 },
    ...products.map(p => ({
      url: `https://yourdomain.com/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
```

---

## Семантическая верстка компонентов — справочник

> **Правило:** каждый компонент использует тег по смыслу, а не `<div>` по умолчанию.
> Семантика = SEO + accessibility (скринридеры) + читаемость кода.

---

### Глобальная структура страницы

```tsx
// src/app/layout.tsx — скелет всего приложения
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>          {/* шапка сайта — один на всё приложение */}
          <nav>           {/* основная навигация */}
            ...
          </nav>
        </header>

        <main>            {/* основной контент страницы — ОДИН на страницу */}
          {children}
        </main>

        <footer>          {/* подвал — контакты, ссылки, копирайт */}
          ...
        </footer>
      </body>
    </html>
  )
}
```

---

### Компоненты Header и Navigation

```tsx
// src/components/shared/Header.tsx
export function Header() {
  return (
    <header>
      <a href="/" aria-label="Handmade Jewelry Store — home">
        <img src="/logo.svg" alt="Handmade Jewelry Store" width={120} height={40} />
      </a>

      <nav aria-label="Main navigation">   {/* aria-label обязателен если nav не единственный */}
        <ul>
          <li><a href="/products">Catalog</a></li>
          <li><a href="/about">About</a></li>
        </ul>
      </nav>

      <div>                                {/* div допустим для утилитарных блоков без смысла */}
        <CartButton />
        <UserMenu />
      </div>
    </header>
  )
}

// ❌ Запрещено
export function Header() {
  return (
    <div className="header">
      <div className="nav">
        <div className="nav-item">...</div>
      </div>
    </div>
  )
}
```

---

### ProductCard — карточка товара

```tsx
// src/components/features/catalog/ProductCard.tsx
// Каждый продукт — самостоятельная сущность → <article>

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article aria-label={product.title}>
      <a href={`/products/${product.slug}`} tabIndex={-1} aria-hidden="true">
        <figure>
          <Image
            src={product.images[0]}
            alt={`${product.title} — handmade jewelry`}
            width={400}
            height={400}
          />
        </figure>
      </a>

      <div>                              {/* div для группировки текста — нет семантики, ок */}
        <h2>
          <a href={`/products/${product.slug}`}>{product.title}</a>
        </h2>

        <p>{product.description.slice(0, 100)}...</p>

        {/* <data> — машиночитаемое значение цены */}
        <data value={product.price} className="price">
          ${product.price}
        </data>
      </div>

      <AddToCartButton productId={product.id} />
    </article>
  )
}
```

---

### ProductGrid — список карточек

```tsx
// src/components/features/catalog/ProductGrid.tsx
// Список однотипных элементов → <ul> + <li>

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <section aria-label="Products">
      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <ul role="list">          {/* role="list" нужен — CSS list-style:none убирает семантику в Safari */}
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

---

### Страница продукта — детальная

```tsx
// src/app/(shop)/products/[slug]/page.tsx
export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.slug)

  return (
    <article itemScope itemType="https://schema.org/Product">  {/* microdata как альтернатива JSON-LD */}

      {/* Хлебные крошки */}
      <nav aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li><a href="/products">Catalog</a></li>
          <li aria-current="page">{product.title}</li>
        </ol>
      </nav>

      <h1 itemProp="name">{product.title}</h1>

      {/* Галерея — figure для медиа с подписью */}
      <figure>
        <Image
          src={product.images[0]}
          alt={`${product.title} — close up`}
          width={800}
          height={800}
          priority              // LCP — первое изображение всегда priority
        />
        <figcaption>{product.title}</figcaption>
      </figure>

      {/* Описание — читается Google и скринридерами */}
      <section aria-label="Product description">
        <h2>About this piece</h2>
        <p itemProp="description">{product.description}</p>
      </section>

      {/* Цена и действие */}
      <section aria-label="Purchase">
        <data value={product.price} className="price">
          ${product.price}
        </data>
        <AddToCartButton productId={product.id} />   {/* Client Component */}
      </section>

    </article>
  )
}
```

---

### Фильтры каталога

```tsx
// src/components/features/catalog/Filters.tsx
// Фильтры — дополнительный контент рядом с основным → <aside>

export function CatalogSidebar() {
  return (
    <aside aria-label="Product filters">
      <section>
        <h2>Category</h2>
        <ul role="list">
          {categories.map((cat) => (
            <li key={cat.id}>
              <label>
                <input type="checkbox" name="category" value={cat.slug} />
                {cat.name}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Price range</h2>
        <label htmlFor="price-min">From</label>
        <input id="price-min" type="number" name="priceMin" min={0} />
        <label htmlFor="price-max">To</label>
        <input id="price-max" type="number" name="priceMax" min={0} />
      </section>
    </aside>
  )
}
```

---

### Форма оформления заказа

```tsx
// src/components/features/cart/CheckoutForm.tsx
// Форма — всегда <form>, группы полей — <fieldset> + <legend>

export function CheckoutForm() {
  return (
    <form onSubmit={handleSubmit} noValidate>

      <fieldset>
        <legend>Contact information</legend>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          name="email"
          required
          autoComplete="email"
          aria-describedby="email-error"
        />
        <span id="email-error" role="alert" aria-live="polite">
          {errors.email}
        </span>
      </fieldset>

      <fieldset>
        <legend>Shipping address</legend>
        <label htmlFor="address">Street address</label>
        <input
          id="address"
          type="text"
          name="address"
          required
          autoComplete="street-address"
        />
      </fieldset>

      <button type="submit">Place order</button>
    </form>
  )
}
```

---

### Поиск

```tsx
// src/components/shared/SearchBar.tsx
// Поиск — <search> (HTML5) или <form role="search">

export function SearchBar() {
  return (
    <search>                                {/* HTML5.3 тег, замена <form role="search"> */}
      <label htmlFor="search" className="sr-only">Search products</label>
      <input
        id="search"
        type="search"
        name="q"
        placeholder="Search jewelry..."
        autoComplete="off"
      />
      <button type="submit" aria-label="Search">
        <SearchIcon aria-hidden="true" />
      </button>
    </search>
  )
}
```

---

### Footer

```tsx
// src/components/shared/Footer.tsx
export function Footer() {
  return (
    <footer>
      <nav aria-label="Footer navigation">
        <ul role="list">
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/shipping">Shipping policy</a></li>
        </ul>
      </nav>

      <address>                           {/* контактная информация автора/организации */}
        <a href="mailto:hello@yourdomain.com">hello@yourdomain.com</a>
      </address>

      <small>
        <p>© {new Date().getFullYear()} Handmade Jewelry Store. All rights reserved.</p>
      </small>
    </footer>
  )
}
```

---

### Быстрый справочник — тег к компоненту

| Компонент | Тег | Почему |
|-----------|-----|--------|
| Шапка сайта | `<header>` | Landmark — Google и скринридеры находят автоматически |
| Главная навигация | `<nav>` | Landmark навигации |
| Основной контент | `<main>` | Один на страницу, скринридер прыгает сюда |
| Подвал | `<footer>` | Landmark подвала |
| Карточка продукта | `<article>` | Самостоятельная единица контента |
| Список карточек | `<ul>` + `<li>` | Список однотипных элементов |
| Хлебные крошки | `<nav>` + `<ol>` | `<ol>` — упорядоченный список, `<ol>` = порядок важен |
| Фильтры / сайдбар | `<aside>` | Дополнительный контент рядом с основным |
| Галерея изображений | `<figure>` + `<figcaption>` | Медиа с подписью |
| Цена | `<data value="29.99">` | Машиночитаемое значение |
| Форма | `<form>` | Всегда, никогда не `<div>` |
| Группа полей формы | `<fieldset>` + `<legend>` | Семантическая группировка |
| Поиск | `<search>` | HTML5.3, или `<form role="search">` |
| Контакты | `<address>` | Контактная информация |
| Копирайт | `<small>` | Мелкий юридический текст |
| Кнопка без формы | `<button type="button">` | Не `<div onClick>`, не `<a>` без href |
| Иконка декоративная | `<svg aria-hidden="true">` | Скрыть от скринридеров |

---

### Что никогда не делать

```tsx
// ❌ div вместо button — ломает keyboard navigation и accessibility
<div onClick={handleClick} className="btn">Add to cart</div>

// ✅
<button type="button" onClick={handleClick}>Add to cart</button>

// ❌ a без href — не ссылка, а притворяется
<a onClick={navigate}>Products</a>

// ✅ — если это навигация
<a href="/products">Products</a>

// ✅ — если это действие без URL
<button type="button" onClick={handleAction}>Action</button>

// ❌ Заголовки для стилизации, а не структуры
<h3>Section that visually looks small</h3>  // h3 без h1 и h2 выше

// ✅ Стилизуй через className, структуру через логику
<h2 className="text-sm">Section</h2>

// ❌ Картинки без alt
<img src={src} />
<Image src={src} alt="" />

// ✅
<Image src={src} alt="Sterling silver ring with moonstone — handmade" />
```

---

## Чеклист перед каждым PR с компонентом страницы

```
[ ] Страница имеет уникальные title и description (не дефолтные из layout)
[ ] Динамическая страница использует generateMetadata
[ ] Есть canonical URL на динамических страницах
[ ] OpenGraph теги заполнены
[ ] Все изображения через next/image с описательным alt
[ ] Первое изображение имеет priority={true}
[ ] h1 присутствует и единственный на странице
[ ] Семантические теги: main, section, nav, article (не div-суп)
[ ] Страница — Server Component (нет 'use client' без причины)
[ ] URL использует slug, не ID
[ ] Страница продукта имеет JSON-LD разметку
```

---

## SEO-инструменты для проверки (использовать перед деплоем)

| Инструмент | Что проверяет |
|---|---|
| Google Search Console | Индексация, Core Web Vitals, ошибки |
| PageSpeed Insights | LCP, CLS, INP + советы |
| Schema Markup Validator | Правильность JSON-LD |
| Screaming Frog (бесплатно до 500 URL) | Технический аудит |
| Ahrefs Webmaster Tools (бесплатно) | Обратные ссылки, ключевые слова |
