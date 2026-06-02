# measurement-toggle (custom)

**Effort:** low. **Impact:** medium.

## Что делает

Гарантирует:
- Storage всегда метрика (`Cm`, `Grams`)
- Display через `useMeasurementSystem()` hook
- Bead size в mm + weight в g — **никогда не конвертируются** (универсальные единицы)
- Ring sizes — separate lookup table, не конвертация

## Trigger

- User: `/measurement <field>` или "добавь измерение"
- Auto-suggest на правку компонента, отображающего размер

## SKILL.md

````markdown
---
name: measurement-toggle
description: Use when displaying or computing measurements (length, width, height, weight, bead size, ring size). Enforces metric storage, display-time conversion via useMeasurementSystem(), and the rules that bead size in mm + ring weight in grams are NEVER converted, while ring sizes use a lookup table.
---

# measurement-toggle

## Invariants

### Storage (Prisma)

| Field | Type | Suffix | Example |
| --- | --- | --- | --- |
| Length/width/height/depth | `Int` | `Cm` | `lengthCm: 12` |
| Weight (jewelry overall) | `Int` | `Grams` | `weightGrams: 5` |
| Bead diameter | `Float` | `Mm` | `beadSizeMm: 6.5` |
| Ring size | enum/string | — | `ringSizeUs: "7"` / `ringSizeEu: "54"` |

### Display

```tsx
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem'
import { formatLength, formatWeight } from '@/lib/measurement-format'

const { system } = useMeasurementSystem()  // 'metric' | 'imperial'

<span>{formatLength(product.lengthCm, system)}</span>
// system='metric' → "12 cm"
// system='imperial' → "4.72 in"

<span>{formatWeight(product.weightGrams, system)}</span>
// system='metric' → "5 g"
// system='imperial' → "0.18 oz"

<span>{product.beadSizeMm} mm</span>
// ALWAYS mm — universal, no conversion
```

### Ring sizes

**Never** convert via formula. Use lookup table from `apps/web/src/lib/ring-sizes.ts`:

```ts
export const ringSizes = [
  { us: '5', eu: '49', uk: 'J', jp: '9', diameterMm: 15.7 },
  { us: '6', eu: '52', uk: 'L 1/2', jp: '12', diameterMm: 16.45 },
  // ...
]
```

## Hard rules

1. **No formula `inch = cm / 2.54`** in any place except `formatLength()`. Single source of truth.
2. **Bead size NEVER converted** — always `mm`.
3. **Ring weight NEVER converted** — always `g` (grams is universal in jewelry).
4. **Ring sizes always lookup**, never formula.
5. **Storage = metric, always.** API returns metric. Conversion is presentation.

## Procedure

1. Identify measurement display in target file.
2. Check storage field name → must be `*Cm`, `*Grams`, `*Mm` суффикс.
3. Refactor to use `useMeasurementSystem()` + `formatLength/Weight`.
4. For bead size — direct mm display.
5. For ring size — use `RingSizePicker` component (см. `/ring-size-picker`).
````

## Зависимости

- `apps/web/src/hooks/useMeasurementSystem.ts` (settings hook)
- `apps/web/src/lib/measurement-format.ts`
- `apps/web/src/lib/ring-sizes.ts`

## Источник

- docs/10_MEASUREMENT_SYSTEMS.md
- CLAUDE.md → "Measurements stored in metric"
