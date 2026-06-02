# ring-size-picker (custom)

**Effort:** low. **Impact:** medium.

## Что делает

Скаффолд компонента выбора размера кольца с lookup-таблицей US / EU / UK / JP. Включает:
- Системы переключения (US, EU, UK, JP) с persisted preference
- Диаметр в mm как информация
- "Find my ring size" гид
- Accessibility (radio group)

## Trigger

- User: `/ring-size-picker` или "создай ring size picker"

## SKILL.md

````markdown
---
name: ring-size-picker
description: Use when scaffolding a ring size picker component or when adding ring-size selection to a product detail page. Uses the lookup table at apps/web/src/lib/ring-sizes.ts (US/EU/UK/JP/diameter), persisted system preference, accessible radio group, and a "find my ring size" guide link.
---

# ring-size-picker

## Files created

- `apps/web/src/components/features/product/RingSizePicker/RingSizePicker.client.tsx`
- `apps/web/src/components/features/product/RingSizePicker/RingSizePicker.spec.tsx`
- `apps/web/src/components/features/product/RingSizePicker/index.ts`

## Template

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ringSizes, type RingSizeSystem } from '@/lib/ring-sizes'

interface RingSizePickerProps {
  selected?: string
  onChange: (size: string, system: RingSizeSystem) => void
}

export function RingSizePicker({ selected, onChange }: RingSizePickerProps) {
  const t = useTranslations('product.ringSize')
  const [system, setSystem] = useState<RingSizeSystem>('us')

  return (
    <fieldset>
      <legend className="text-sm font-medium text-foreground">{t('label')}</legend>

      <div role="tablist" aria-label={t('systemLabel')}>
        {(['us', 'eu', 'uk', 'jp'] as const).map((sys) => (
          <button
            key={sys}
            role="tab"
            aria-selected={system === sys}
            onClick={() => setSystem(sys)}
          >
            {t(`system.${sys}`)}
          </button>
        ))}
      </div>

      <div role="radiogroup" aria-label={t('sizeLabel')}>
        {ringSizes.map((size) => (
          <label key={size.us}>
            <input
              type="radio"
              name="ringSize"
              value={size[system]}
              checked={selected === size[system]}
              onChange={() => onChange(size[system], system)}
            />
            <span>{size[system]}</span>
            <span className="text-xs text-muted-foreground">
              ({size.diameterMm} mm)
            </span>
          </label>
        ))}
      </div>

      <a href="/help/ring-size-guide" className="text-sm text-primary underline">
        {t('findMySize')}
      </a>
    </fieldset>
  )
}
```

## i18n keys to add

- `product.ringSize.label`: "Ring size" / "Размер кольца" / "Talla del anillo"
- `product.ringSize.systemLabel`: "Size system"
- `product.ringSize.sizeLabel`: "Select size"
- `product.ringSize.system.us`: "US"
- `product.ringSize.system.eu`: "EU"
- `product.ringSize.system.uk`: "UK"
- `product.ringSize.system.jp`: "JP"
- `product.ringSize.findMySize`: "Find my ring size →"

(Invoke `/i18n-sync` to populate.)

## Hard rules

- **No formula** for size conversion — use `ringSizes` table only.
- **Diameter shown** as helper text (mm is universal).
- **Persisted system preference** in Zustand store (under `userPreferences`).
- **Accessible** — fieldset + legend + radio group + tablist for system.
- **No raw colors** — theme tokens only.
````

## Зависимости

- `apps/web/src/lib/ring-sizes.ts` (lookup table)
- Help page `/help/ring-size-guide` (separate task)
- Zustand store для system preference

## Источник

- docs/10_MEASUREMENT_SYSTEMS.md
