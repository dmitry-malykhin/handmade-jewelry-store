# shadcn-themed-add (custom)

**Effort:** low. **Impact:** medium.

## Что делает

Обёртка над `pnpm dlx shadcn add <component>`:

1. Запускает оригинальную команду
2. После — авто-замена сырых цветов на семантические токены:
   - `text-gray-900` → `text-foreground`
   - `bg-white` → `bg-background`
   - `border-gray-200` → `border-border`
   - `text-gray-500` → `text-muted-foreground`
   - `hover:bg-gray-100` → `hover:bg-accent hover:text-accent-foreground`
3. Удаляет hardcoded цвета для dark mode (Shadcn часто оставляет defaults)
4. Добавляет dark mode тестируемый screenshot snapshot если возможно

## Trigger

- User: `/shadcn-add button`
- Auto-suggest на любую команду `shadcn add` в Bash

## SKILL.md

````markdown
---
name: shadcn-themed-add
description: Use when adding a Shadcn/ui component (instead of raw `shadcn add`). Wraps the command, then rewrites the generated component to use semantic theme tokens only, removing raw colors that would break dark mode.
---

# shadcn-themed-add

## Procedure

1. Run original command: `pnpm dlx shadcn@latest add <component>`.
2. Locate generated files (usually `apps/web/src/components/ui/<component>.tsx`).
3. Apply regex replacements:

   ```
   text-gray-900   → text-foreground
   text-gray-700   → text-foreground
   text-gray-500   → text-muted-foreground
   text-gray-400   → text-muted-foreground
   bg-white        → bg-background
   bg-gray-50      → bg-muted
   bg-gray-100     → bg-muted
   border-gray-200 → border-border
   border-gray-300 → border-input
   hover:bg-gray-50 → hover:bg-accent hover:text-accent-foreground
   hover:bg-gray-100 → hover:bg-accent hover:text-accent-foreground
   focus:ring-blue-500 → focus:ring-ring
   ```

4. Report changes made.
5. Run `pnpm --filter web exec tsc --noEmit` to confirm no breaks.

## Hard rules

- **No raw color classes** remain after rewrite.
- **No `dark:` prefixes added** — semantic tokens already handle that via CSS variables.
- **Don't touch logic** — only Tailwind class names.
- If color has no semantic equivalent — flag it and ask user to define new CSS variable in `globals.css`.

## When NOT to use

- Custom components — `shadcn add` is only for the official Shadcn library.
- Already-existing components — use Edit tool directly.
````

## Зависимости

- Shadcn/ui setup (`components.json` exists)
- Tailwind config with semantic tokens

## Источник

- CLAUDE.md → "Theming — mandatory on every component"
- https://ui.shadcn.com/docs/theming
