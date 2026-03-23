# Measurement Systems — Imperial vs Metric

> Анализ систем измерения для ювелирного магазина.
> Вывод: **включить в скоуп MVP** — US рынок требует дюймы, но хранить метрику.
> Последнее обновление: 2026-03-23

---

## Содержание

1. [Проблема и контекст](#1-проблема-и-контекст)
2. [Что именно измеряется в украшениях](#2-что-именно-измеряется-в-украшениях)
3. [Стандарты рынка США vs Европа](#3-стандарты-рынка-сша-vs-европа)
4. [Архитектурное решение](#4-архитектурное-решение)
5. [Изменения в схеме БД](#5-изменения-в-схеме-бд)
6. [Backend — ConversionService](#6-backend--conversionservice)
7. [Frontend — реализация](#7-frontend--реализация)
8. [Размеры колец — отдельная история](#8-размеры-колец--отдельная-история)
9. [Когда и как внедрять](#9-когда-и-как-внедрять)
10. [GitHub Issues для беклога](#10-github-issues-для-беклога)

---

## 1. Проблема и контекст

Американский покупатель привык к дюймам. Европейский — к сантиметрам.

> "How long is this necklace?" — US покупатель ожидает ответ "18 inches", а не "45.7 cm"

Проблема не в хранении — она в **отображении**. Важно:
- Не заставлять US покупателей конвертировать вручную
- Не хранить данные в двух системах одновременно
- Размеры кольца — принципиально разные системы (не просто умножение)

---

## 2. Что именно измеряется в украшениях

### Размеры изделий

| Атрибут | US отображение | EU отображение | База хранения |
|---|---|---|---|
| Длина цепочки/колье | `18 inches` | `45.7 cm` | cm |
| Длина браслета | `7 inches` | `17.8 cm` | cm |
| Длина лариата | `46 inches` | `117 cm` | cm |
| Ширина изделия | `0.5 inches` | `12.7 mm` | cm |
| Размер подвески | `1.2 × 0.8 inches` | `3 × 2 cm` | cm |
| Диаметр браслета | `2.75 inches` | `7 cm` | cm |
| Размер бусины | `0.24 inches (6mm)` | `6 mm` | cm |

### Вес

| Атрибут | US отображение | EU отображение | База |
|---|---|---|---|
| Вес изделия | `4.2 grams` | `4.2 grams` | grams |

**Вес:** Граммы используются **повсеместно в ювелирном деле**, даже в США. Не нужно конвертировать в унции. Оставить граммы в обеих системах.

### Размер кольца

Принципиально разные системы — не линейная конвертация!

| Система | Пример | Основа |
|---|---|---|
| US/Canada | 5, 5.5, 6, 6.5, 7... | Произвольная числовая шкала |
| EU | 49, 50, 51, 52... | Длина окружности в мм |
| UK/Australia | H, I, J, K... | Буквы алфавита |
| Japan | 9, 10, 11, 12... | Своя шкала |
| Swiss/French | 49, 50, 51... | Похоже на EU, но отличается |

---

## 3. Стандарты рынка США vs Европа

### США (основной рынок)

Стандартные описания на Etsy (американские продавцы):
```
• Necklace length: 18 inches
• Bracelet length: 7 inches (fits wrist 6.5–7.5 inches)
• Pendant size: 1.2 inches × 0.8 inches
• Bead size: 6mm (Americans accept mm for beads — industry standard)
```

Бусины — исключение: американские ювелиры используют мм для размера бусин (4mm, 6mm, 8mm). Это принято даже в US-рынке.

### Европа

```
• Länge der Halskette: 45 cm
• Armbandlänge: 18 cm
• Anhänger: 3 × 2 cm
```

### Вывод

- **Основная система для US старта: Imperial (дюймы)**
- Бусины оставить в мм (универсальный ювелирный стандарт)
- Вес оставить в граммах (универсально)
- Переключатель нужен для EU расширения

---

## 4. Архитектурное решение

### Правило: Хранить в метрике, показывать в зависимости от предпочтения

```
DB:           lengthCm = 45.72   (всегда в сантиметрах)
                ↓
Logic:        convertLength(45.72, 'cm', 'in') = 18.0
                ↓
Frontend:     "18 inches"  (для US)
              "45.7 cm"    (для EU)
```

**Почему метрика в БД?**
- Метрика — международный стандарт хранения данных
- Google Shopping feed использует cm
- Легче конвертировать cm → in, чем поддерживать два набора полей
- Вычисления (объём посылки, стоимость доставки) проще в метрике

### Где хранится выбор системы

1. **Без авторизации**: `localStorage.setItem('measurementSystem', 'imperial')`
2. **По умолчанию**: определять по `Accept-Language` header или геолокации
   - `en-US`, `en-CA` → imperial
   - `de`, `fr`, `es`, `ru` → metric
3. **С авторизацией**: `UserPreference.measurementSystem` в БД (см. doc #09)

---

## 5. Изменения в схеме БД

### Product — поля для размеров (уже в domain analysis, добавить при Issue #64)

```prisma
model Product {
  // ... существующие поля ...

  // Размеры — хранятся в метрике, конвертируются на frontend
  lengthCm      Float?   // основная длина (колье, браслет, лариат)
  widthCm       Float?   // ширина изделия
  heightCm      Float?   // высота подвески/кулона
  diameterCm    Float?   // диаметр (для браслетов-колечек)
  weightGrams   Float?   // вес в граммах (НЕ конвертировать — граммы универсальны)
  beadSizeMm    Float?   // размер бусины в мм (НЕ конвертировать — мм для бусин универсальны)

  // Для колец (post-MVP когда появятся кольца)
  // ringSizeUs     Float?   // US ring size (хранить отдельно — нет простой формулы)
  // ringSizeEu     Int?     // EU ring size = длина окружности в мм
}
```

**Чего НЕ добавлять:**
- `lengthIn` — избыточно, конвертация на лету
- `lengthFt` — не используется в ювелирке
- Несколько полей за одно и то же — анти-паттерн

---

## 6. Backend — ConversionService

```typescript
// packages/shared/src/utils/measurementConverter.ts

export type MeasurementSystem = 'imperial' | 'metric'

const CM_TO_INCHES = 0.393701
const INCHES_TO_CM = 2.54

export function convertLength(
  valueCm: number,
  targetSystem: MeasurementSystem,
): { value: number; unit: string; formatted: string } {
  if (targetSystem === 'imperial') {
    const inches = Math.round(valueCm * CM_TO_INCHES * 4) / 4  // round to nearest 0.25"
    return {
      value: inches,
      unit: 'in',
      formatted: `${inches} inches`,
    }
  }
  return {
    value: Math.round(valueCm * 10) / 10,  // round to 1 decimal
    unit: 'cm',
    formatted: `${Math.round(valueCm * 10) / 10} cm`,
  }
}

export function convertDimensions(
  lengthCm: number,
  widthCm: number,
  targetSystem: MeasurementSystem,
): string {
  if (targetSystem === 'imperial') {
    const l = Math.round(lengthCm * CM_TO_INCHES * 100) / 100
    const w = Math.round(widthCm * CM_TO_INCHES * 100) / 100
    return `${l} × ${w} inches`
  }
  return `${Math.round(lengthCm * 10) / 10} × ${Math.round(widthCm * 10) / 10} cm`
}

// Пример использования:
// convertLength(45.72, 'imperial') → { value: 18, unit: 'in', formatted: '18 inches' }
// convertLength(45.72, 'metric')   → { value: 45.7, unit: 'cm', formatted: '45.7 cm' }
```

### Ошибки округления — важно!

| Реальная длина (cm) | Конвертация в дюймы | Правильное округление |
|---|---|---|
| 45.72 | 18.0 in | 18 inches ✅ |
| 43.18 | 17.0 in | 17 inches ✅ |
| 40.64 | 16.0 in | 16 inches ✅ |
| 42.0 | 16.54 in | 16.5 inches ✅ (кратно 0.25) |

Округлять до ближайшего 0.25 дюйма для длины цепочек (стандарт индустрии).

---

## 7. Frontend — реализация

### Компонент MeasurementToggle

```tsx
// apps/web/src/components/ui/MeasurementToggle.tsx
// Позиция: в Header рядом с языковым переключателем (или на странице продукта)

'use client'

export function MeasurementToggle() {
  const { measurementSystem, setMeasurementSystem } = useMeasurementSystem()

  return (
    <button onClick={() => setMeasurementSystem(
      measurementSystem === 'imperial' ? 'metric' : 'imperial'
    )}>
      {measurementSystem === 'imperial' ? 'in' : 'cm'}
    </button>
  )
}
```

### Zustand store — useMeasurementSystem

```typescript
// apps/web/src/stores/measurementSystem.store.ts

interface MeasurementSystemState {
  measurementSystem: MeasurementSystem
  setMeasurementSystem: (system: MeasurementSystem) => void
}

export const useMeasurementSystemStore = create<MeasurementSystemState>()(
  persist(
    (set) => ({
      measurementSystem: 'imperial',  // default for US market
      setMeasurementSystem: (measurementSystem) => set({ measurementSystem }),
    }),
    {
      name: 'measurement-system',  // localStorage key
      skipHydration: true,  // prevents SSR/client mismatch
    },
  ),
)
```

### ProductDimensions компонент

```tsx
// apps/web/src/components/product/ProductDimensions.tsx

export function ProductDimensions({ product }: { product: Product }) {
  const { measurementSystem } = useMeasurementSystemStore()

  const necklaceLength = product.lengthCm
    ? convertLength(product.lengthCm, measurementSystem)
    : null

  return (
    <dl>
      {necklaceLength && (
        <>
          <dt>Length</dt>
          <dd>{necklaceLength.formatted}</dd>
        </>
      )}
      {product.weightGrams && (
        <>
          <dt>Weight</dt>
          <dd>{product.weightGrams}g</dd>  {/* граммы всегда */}
        </>
      )}
      {product.beadSizeMm && (
        <>
          <dt>Bead size</dt>
          <dd>{product.beadSizeMm}mm</dd>  {/* мм для бусин всегда */}
        </>
      )}
    </dl>
  )
}
```

### Где показывать переключатель

1. **Header** — рядом с флагом языка (меняет всё сразу)
2. **Product page** — маленький toggle "in | cm" рядом с размерами (локально для страницы)
3. **Cart** — показывать в units, которые выбрал пользователь

---

## 8. Размеры колец — отдельная история

> Кольца пока не в ассортименте, но заложить в архитектуру нужно.

### Таблица конвертации US → EU

| US Size | Диаметр (mm) | EU Size | UK Size |
|---|---|---|---|
| 4 | 14.88 | 47 | H |
| 5 | 15.70 | 49.5 | J |
| 6 | 16.51 | 52 | L |
| 6.5 | 16.92 | 53 | M |
| 7 | 17.35 | 54.5 | N |
| 7.5 | 17.75 | 55.5 | O |
| 8 | 18.19 | 57 | P |
| 8.5 | 18.61 | 58.5 | Q |
| 9 | 19.41 | 61 | R |

### Хранение в БД (когда появятся кольца)

```prisma
model ProductVariant {
  // ... существующие поля ...
  ringSizeUs  Float?    // US size: 5, 5.5, 6, 6.5, 7
  ringSizeEu  Int?      // EU size: 49, 50, 51, 52 (circumference mm)
  // UK/Japan не хранить — генерировать из EU size по таблице
}
```

**Не хранить в одном поле** — это принципиально разные системы без простой формулы.

### Ring Size Guide Page

Отдельная страница `/ring-size-guide` с:
- Интерактивным конвертером US ↔ EU ↔ UK
- Инструкцией как измерить размер пальца дома (видео + текст)
- Печатным шаблоном-линейкой (PDF для скачивания)

**SEO-ценность:** "ring size chart", "how to measure ring size" — высокочастотные запросы.

---

## 9. Когда и как внедрять

### До MVP (сейчас — заложить основу)

- [ ] Добавить `lengthCm`, `widthCm`, `weightGrams`, `beadSizeMm` в Product schema (#64)
- [ ] Написать `measurementConverter.ts` в `packages/shared/`
- [ ] Создать `useMeasurementSystemStore` в Zustand
- [ ] Показывать размеры в дюймах по умолчанию (US-friendly без переключателя)

**Почему до MVP:** Заполнять данные о продуктах придётся ДО запуска. Если сейчас не добавить поля в БД — придётся делать ещё одну миграцию и вручную вводить размеры всех товаров снова.

### MVP (при добавлении продуктов)

- [ ] MeasurementToggle компонент в Header
- [ ] ProductDimensions компонент на карточке продукта
- [ ] Default = imperial (для US)

### После MVP

- [ ] Геолокационный default (`en-US` → imperial, `de-DE` → metric)
- [ ] Ring Size Guide page (когда появятся кольца)
- [ ] Синхронизация с `UserPreference` (после внедрения Auth)

---

## 10. GitHub Issues для беклога

Создать следующие issues:

### Issue: Размеры продуктов — поля в БД и данные

```
Title: feat: Product dimensions — add lengthCm, widthCm, weightGrams fields to schema

Description:
Add dimension fields to the Product model to support both imperial and metric display.

Scope:
- Add lengthCm, widthCm, heightCm, diameterCm, weightGrams, beadSizeMm to Product in schema.prisma
- Create migration
- Update seed script with realistic dimension data for all 5 products
- Add validation in ProductCreateDto (admin API)

Why before MVP: Product data needs to be entered before launch.
If dimensions are missing from schema, we must re-enter all product data after migration.

Related: #64 (Products API CRUD)
```

### Issue: Система измерений — imperial/metric переключатель

```
Title: feat: Measurement system toggle — imperial/metric display for product dimensions

Description:
Add measurement system preference with toggle so US users see inches
and EU users see centimeters.

Scope:
- measurementConverter.ts utility in packages/shared/
  - convertLength(cm, system) → { value, unit, formatted }
  - convertDimensions(lengthCm, widthCm, system) → string
- useMeasurementSystemStore Zustand store with localStorage persistence
- MeasurementToggle component in Header (in/cm button)
- ProductDimensions component on product page and product card
- Default: imperial (US market target)
- Bead size: always in mm (jewelry industry standard)
- Weight: always in grams (universal)

Pre-MVP (must be in launch scope).
```

### Issue: Ring Size Guide (Post-MVP)

```
Title: feat: Ring size guide page — US to EU to UK size conversion chart

Description:
Add /ring-size-guide page with interactive ring size converter.

SEO target keywords: "ring size chart", "how to measure ring size at home"

Scope (post-MVP, when rings are added to catalog):
- /ring-size-guide static page
- Interactive converter US ↔ EU ↔ UK
- How-to-measure instructions (text + image)
- Printable size guide (PDF link)
- JSON-LD for ring size content
```
