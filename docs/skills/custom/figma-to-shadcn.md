# figma-to-shadcn (custom)

**Effort:** medium. **Impact:** medium.

## Что делает

Поверх Figma MCP (`use_figma`, `get_design_context`):
- Маппит Figma-токены → семантические Tailwind токены проекта
- Маппит Figma-компоненты → существующие в `components/ui/` (Shadcn) если есть аналог
- Использует только semantic tokens, никаких raw colors
- Обновляет Code Connect map для tracking
- Если нет аналога — создаёт новый компонент через `/new-feature-component`

## Trigger

- User кидает figma.com URL (auto-suggest)
- User: `/figma-to-shadcn <figma-url>`

## SKILL.md

````markdown
---
name: figma-to-shadcn
description: Use when implementing a Figma design as code. Bridges Figma MCP output to the project's Shadcn/ui + Tailwind semantic tokens. Maps Figma tokens to bg-card/text-foreground/etc., reuses existing UI primitives, creates new feature components only if no match, updates Code Connect map.
---

# figma-to-shadcn

## Prerequisites

- Figma MCP loaded (`get_design_context`, `use_figma` available)
- `components.json` for Shadcn exists
- Code Connect map at `.figma/code-connect.json` (or wherever stored)

## Procedure

1. **Fetch design.** Use `get_design_context` for the given Figma URL.
2. **Identify components.** Top-down: Page → Sections → Components → Primitives.
3. **For each Figma component:**
   - Check Code Connect map: existing binding?
   - If yes → use the bound code component
   - If no → check `components/ui/*` for Shadcn primitive match (Button, Card, Input, Dialog, etc.)
   - If still no → it's a new feature component → invoke `/new-feature-component`
4. **Token mapping:**

   | Figma token | Tailwind class |
   | --- | --- |
   | `colors/text/primary` | `text-foreground` |
   | `colors/text/secondary` | `text-muted-foreground` |
   | `colors/bg/page` | `bg-background` |
   | `colors/bg/card` | `bg-card` |
   | `colors/bg/elevated` | `bg-popover` |
   | `colors/border/default` | `border-border` |
   | `colors/border/input` | `border-input` |
   | `colors/accent/primary` | `bg-primary text-primary-foreground` |
   | `colors/accent/secondary` | `bg-secondary text-secondary-foreground` |
   | `colors/state/destructive` | `bg-destructive text-destructive-foreground` |
   | `spacing/xs` | `p-1` / `gap-1` |
   | `spacing/sm` | `p-2` |
   | `spacing/md` | `p-4` |
   | `spacing/lg` | `p-6` |
   | `radius/sm` | `rounded-sm` |
   | `radius/md` | `rounded-md` |
   | `radius/lg` | `rounded-lg` |

   Tokens not in this map → flag for manual decision, NOT raw color/spacing.

5. **Update Code Connect** for new components:
   ```
   /figma-code-connect (this is built-in Figma skill)
   ```
   Add mapping between Figma component ID and code path.

6. **Output**: list of files created/edited, code component IDs bound in Code Connect.

## Hard rules

1. **No raw colors** — only semantic tokens
2. **Reuse existing UI primitives** — don't duplicate Shadcn Button if it already exists
3. **Respect responsive breakpoints** — Figma desktop+mobile both must be implemented
4. **Theme-aware** — semantic tokens auto-handle dark mode
5. **Accessibility from Figma** — if design has annotations (`aria-label`, focus state) — implement them
6. **No `style={{ ... }}` inline** — Tailwind classes only

## When Figma design doesn't fit Shadcn

If Figma has a custom component that doesn't map (e.g. unusual carousel, complex animation):
- Implement as new feature component (`/new-feature-component`)
- Keep Shadcn primitives as building blocks where possible (Button inside Carousel etc.)
- Don't introduce new design system — stay within project tokens

## Trade-offs

- Token mapping table needs maintenance — keep in sync with `globals.css` CSS variables
- Code Connect map can drift if Figma component rename happens
- Pixel-perfect from Figma rarely needed — focus on spirit + semantic tokens

## Источник

- Figma MCP skill (mandatory: /figma-use)
- Shadcn theming guide
- CLAUDE.md → "Theming"
````

## Зависимости

- Figma MCP (уже загружен)
- Shadcn/ui установлен
- Tailwind v4 + semantic tokens
- Code Connect ([docs](https://www.figma.com/code-connect-docs/))

## Источник

- Figma MCP capabilities
- CLAUDE.md → "Theming — mandatory on every component"
