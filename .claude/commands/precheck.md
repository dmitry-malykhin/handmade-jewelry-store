---
description: Прогнать локально весь набор проверок, который выполняет CI
---

Выполнить `pnpm precheck` — он повторяет последовательность CI:

1. `pnpm --filter @jewelry/shared build`
2. `pnpm lint`
3. `pnpm format:check`
4. `pnpm audit --audit-level=critical`
5. `pnpm --filter api exec tsc --noEmit` и `pnpm --filter web exec tsc --noEmit`
6. `pnpm --filter api test` и `pnpm --filter web test:run`
7. `pnpm --filter web build`

Если команда `precheck` недоступна — запустить `.husky/pre-push`.

Любой красный шаг чинить сразу, затем прогнать заново.
Не останавливаться на «тесты прошли»: CI ловит то, что локальные тесты пропускают —
несобранный `shared`, файлы после автоформатирования, дрейф типов.

Если какой-то шаг объективно не запускается (нет docker, нет окружения) —
сказать об этом явно, чтобы был понятен риск до мержа.

`--no-verify` не предлагать.
